import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AISummaryReqDto } from 'types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Response } from 'express';
import { decimalToNumber } from '../../common/utils/number.utils';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @description 生成AI总结流
   * 返回一个异步可迭代对象，逐步产出字符串分片
   */
  async generateSummaryStream(
    dto: AISummaryReqDto,
  ): Promise<AsyncIterable<string>> {
    const { countryId, year, language = 'zh' } = dto;
    {
      const msg = `【开始】生成AI总结\n- 国家ID: ${countryId}\n- 年份: ${year}\n- 语言: ${language}`;
      this.logger.log(msg);
    }

    // 查询国家与该年评分详情
    const score = await this.prisma.score.findFirst({
      where: { countryId, year, delete: 0, country: { delete: 0 } },
      include: { country: true },
    });
    if (!score) {
      {
        const msg = `【验证失败】评分数据不存在\n- 国家ID: ${countryId}\n- 年份: ${year}`;
        this.logger.warn(msg);
      }
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '未找到该国家该年份的评分数据',
      );
    }
    {
      const countryName = score.country?.cnName || score.country?.enName;
      const total = decimalToNumber(score.totalScore);
      const msg = `【成功】获取评分数据\n- 国家: ${countryName}\n- 总分: ${total}`;
      this.logger.log(msg);
    }

    // 读取评价体系规则（用于提示词背景）
    const evaluations = await this.prisma.scoreEvaluation.findMany({
      orderBy: { minScore: 'asc' },
    });
    this.logger.log(`【成功】获取评价规则 - 共 ${evaluations.length} 条`);

    // 组织 Prompt 背景
    const prompt = this.buildPrompt({ score, evaluations, language });
    {
      const msg = `【成功】构建提示词\n- 系统字数: ${prompt.system.length}\n- 用户字数: ${prompt.user.length}`;
      this.logger.log(msg);
    }

    const llm = new ChatDeepSeek({
      model: 'deepseek-reasoner',
      apiKey: 'sk-9ad711284f7e492d89e2b177bfae4bf7',
      streaming: true,
    });

    // 使用 LangChain Prompt 模板（简单注入）
    const promptTmpl = ChatPromptTemplate.fromMessages([
      ['system', '{system}'],
      ['human', '{user}'],
    ]);

    const chain = promptTmpl.pipe(llm);

    // 以流式模式调用
    const res = await chain.stream({
      system: prompt.system,
      user: prompt.user,
    });
    this.logger.log('【成功】已建立与模型的流式连接');

    // 返回一个异步可迭代，逐段产出内容与推理，两种事件类型：reasoning 与 content
    type StreamChunk =
      | string
      | {
          content?: string | null;
          additional_kwargs?: { reasoning_content?: string | null };
          reasoning_content?: string | null; // 兜底：部分实现可能直接挂在根上
        };

    const iterator = async function* () {
      for await (const c of res as AsyncIterable<StreamChunk>) {
        // 不做格式化处理，原样透传模型返回的字符串
        if (typeof c === 'string') {
          if (c) {
            yield JSON.stringify({ event: 'content', data: c });
          }
          continue;
        }

        const rawContent = typeof c.content === 'string' ? c.content : '';
        const rawReasoningFromNested =
          typeof c.additional_kwargs?.reasoning_content === 'string'
            ? c.additional_kwargs.reasoning_content
            : '';
        const rawReasoning =
          typeof c.reasoning_content === 'string'
            ? c.reasoning_content
            : rawReasoningFromNested;

        if (rawReasoning) {
          yield JSON.stringify({ event: 'reasoning', data: rawReasoning });
        }
        if (rawContent) {
          yield JSON.stringify({ event: 'content', data: rawContent });
        }
      }
    };
    return iterator();
  }

  /**
   * @description 将生成内容以SSE写入到HTTP响应
   */
  async streamSummaryToResponse(
    dto: AISummaryReqDto,
    res: Response,
  ): Promise<void> {
    this.logger.log(
      `开始SSE响应 - 国家ID: ${dto.countryId}, 年份: ${dto.year}`,
    );

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`: connected\n\n`);
    this.logger.log('SSE响应头设置完成，连接已建立');

    try {
      const stream = await this.generateSummaryStream(dto);
      let chunkCount = 0;
      for await (const chunk of stream) {
        chunkCount++;
        // 直接写入 data 字段，payload 为 JSON 字符串，包含 event 与 data 两个字段
        const payload =
          typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
        // 为了保持兼容性，显式写入 event 字段（content/reasoning），前端也可仅解析 data 内的 event
        try {
          const parsed = JSON.parse(payload) as {
            event?: string;
            data?: string;
          };
          if (parsed.event) {
            res.write(`event: ${parsed.event}\n`);
          }
        } catch {
          // 如果解析失败，则作为普通content事件处理
          res.write(`event: content\n`);
        }
        res.write(`data: ${payload}\n\n`);
      }
      res.write('event: end\n');
      res.write('data: [DONE]\n\n');
      res.end();
      this.logger.log(`【响应】SSE完成 - 共发送 ${chunkCount} 个数据块`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI生成失败';
      this.logger.error(
        `【失败】SSE响应 - ${msg}`,
        err instanceof Error ? err.stack : undefined,
      );
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({ message: msg })}\n\n`);
      res.end();
    }
  }

  /**
   * @description 构造提示词：包含国家基本信息、各维度得分、以及前端“评估模型”页面文案的评价逻辑摘要
   */
  private buildPrompt(params: {
    score: {
      year: number;
      totalScore: unknown;
      urbanizationProcessDimensionScore: unknown;
      humanDynamicsDimensionScore: unknown;
      materialDynamicsDimensionScore: unknown;
      spatialDynamicsDimensionScore: unknown;
      country?: { cnName?: string | null; enName?: string | null } | null;
    };
    evaluations: Array<{
      minScore: unknown;
      maxScore: unknown;
      evaluationText?: string | null;
    }>;
    language: 'zh' | 'en';
  }): { system: string; user: string } {
    const { score, evaluations, language } = params;
    const countryName =
      score.country?.cnName || score.country?.enName || '该国家';

    // 评价体系摘要
    const evaluationSummary = evaluations
      .map((e) => {
        const min = decimalToNumber(e.minScore);
        const max = decimalToNumber(e.maxScore);
        const text = e.evaluationText?.slice(0, 60) || '';
        return `(${min} - ${max}) -> ${text}`;
      })
      .join('\n');

    // 构造 system 指令
    const system =
      language === 'zh'
        ? '你是一名研究城市与区域发展的专家。请基于提供的得分、评价体系与互联网最新公开资料，撰写严谨、客观、可读性强的年度国家综合评价报告。引用事实需准确，避免夸张。必要时在文中自然融入来源出处的组织或报告名称。请直接输出Markdown格式内容，不要用代码块包装。字数控制在500-1000字。'
        : 'You are an expert in urban and regional development. Based on the provided scores, evaluation framework, and the latest public information on the internet, write a rigorous, objective, and readable annual national comprehensive assessment. Cite facts accurately and avoid exaggeration. Optionally mention credible sources naturally. Please output Markdown content directly without wrapping it in code blocks.';

    // 构造 user 内容
    const user = [
      language === 'zh'
        ? `国家：${countryName}（${score.country?.enName || ''}）`
        : `Country: ${score.country?.enName || countryName}`,
      language === 'zh' ? `年份：${score.year}` : `Year: ${score.year}`,
      language === 'zh'
        ? `综合评分：${decimalToNumber(score.totalScore)}`
        : `Total Score: ${decimalToNumber(score.totalScore)}`,
      language === 'zh'
        ? `分维度得分：城镇化进程=${decimalToNumber(score.urbanizationProcessDimensionScore)}；人口迁徙动力=${decimalToNumber(score.humanDynamicsDimensionScore)}；经济发展动力=${decimalToNumber(score.materialDynamicsDimensionScore)}；空间发展动力=${decimalToNumber(score.spatialDynamicsDimensionScore)}`
        : `Dimension Scores: Urbanization Process=${decimalToNumber(score.urbanizationProcessDimensionScore)}; Human Dynamics=${decimalToNumber(score.humanDynamicsDimensionScore)}; Material/Economic Dynamics=${decimalToNumber(score.materialDynamicsDimensionScore)}; Spatial Dynamics=${decimalToNumber(score.spatialDynamicsDimensionScore)}`,
      language === 'zh'
        ? '评价模型摘要（来自系统内"评估模型"页）：重视全样本与重点样本、多维度综合评价、区域性集中趋势，以及基于客观赋权法的综合得分。'
        : 'Model summary: emphasizes full sample vs. key samples, multidimensional evaluation, regional concentration trends, and objective weighting-based composite scoring.',
      language === 'zh'
        ? `评价体系（分数区间 -> 文案摘要）：\n${evaluationSummary}`
        : `Evaluation framework (range -> brief text):\n${evaluationSummary}`,
      language === 'zh'
        ? '请联网检索近一年内与该国家相关的城镇化、人口、经济、空间等维度的重要事实变化（政策、数据发布、报告要点、重大项目等），结合上述得分给出结构化总结。包含以下结构：\n\n## 摘要\n\n## 综合判断\n\n## 维度分析\n- **城镇化进程**\n- **人口迁徙动力**\n- **经济发展动力**\n- **空间发展动力**\n\n## 政策建议\n\n## 风险与不确定性。'
        : 'Search the web for past-year developments relevant to urbanization, population, economy, and spatial dynamics for this country, then produce a structured summary in Markdown format with the following structure:\n\n## Abstract\n\n## Overall Assessment\n\n## Dimension Analysis\n- **Urbanization Process**\n- **Human Dynamics**\n- **Material/Economic Dynamics**\n- **Spatial Dynamics**\n\n## Policy Recommendations\n\n## Risks and Uncertainties\n\nLength: 600-900 words.',
    ].join('\n');

    return { system, user };
  }
}
