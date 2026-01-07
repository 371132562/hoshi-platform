import { Injectable } from '@nestjs/common';

import { BusinessException } from '../../common/exceptions/allExceptionsFilter';
import { WinstonLoggerService } from '../../common/services/winston-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '../../types/response';
import {
  CreateOrganizationReqDto,
  OrganizationRes,
  UpdateOrganizationReqDto,
} from './organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * 获取部门树
   */
  async getOrganizationTree(): Promise<OrganizationRes[]> {
    this.logger.log('[操作] 获取部门列表');

    try {
      const orgs = await this.prisma.organization.findMany({
        where: { delete: 0 },
        orderBy: { createTime: 'asc' },
      });

      // 转换为树形结构
      const tree = this.buildTree(orgs);
      return tree;
    } catch (error) {
      this.logger.error(
        `[失败] 获取部门列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 构建树形结构辅助方法
   */
  private buildTree(items: OrganizationRes[]): OrganizationRes[] {
    const map = new Map<string, OrganizationRes>();
    const roots: OrganizationRes[] = [];

    // 初始化 Map，并添加 children 数组
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    // 组装树
    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        const parent = map.get(item.parentId);
        // 设置当前节点的 parentName
        node.parentName = parent?.name || null;
        parent!.children!.push(node);
      } else {
        // 如果没有父节点，或者父节点不在列表里（可能被删除了，或者就是根节点如 "0" 但 "0" 也在列表里）
        // 我们的 seed 中 "0" 是存在的。
        // 如果 parentId 是 "0"，且 "0" 也在 items 中，那么会被加入到 "0" 的 children。
        // 如果 "0" 是根，它的 parentId 是 null。
        roots.push(node);
      }
    });

    // 清理空 children，避免前端展示无意义的展开图标
    map.forEach((node) => {
      if (node.children && node.children.length === 0) {
        delete node.children;
      }
    });

    return roots;
  }

  /**
   * 创建部门
   */
  async createOrganization(dto: CreateOrganizationReqDto) {
    this.logger.log(`[操作] 创建部门 - 名称: ${dto.name}`);
    try {
      // 校验父节点是否存在
      if (dto.parentId) {
        const parent = await this.prisma.organization.findFirst({
          where: { id: dto.parentId, delete: 0 },
        });
        if (!parent) {
          throw new BusinessException(ErrorCode.INVALID_INPUT, '父部门不存在');
        }
      }

      await this.prisma.organization.create({
        data: {
          name: dto.name,
          parentId: dto.parentId,
          description: dto.description,
        },
      });
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 创建部门 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 更新部门
   */
  async updateOrganization(dto: UpdateOrganizationReqDto) {
    this.logger.log(`[操作] 更新部门 - ID: ${dto.id}`);
    try {
      const org = await this.prisma.organization.findFirst({
        where: { id: dto.id, delete: 0 },
      });
      if (!org) {
        throw new BusinessException(ErrorCode.INVALID_INPUT, '部门不存在');
      }

      // 检查循环引用 (如果修改了 parentId)
      if (dto.parentId && dto.parentId !== org.parentId) {
        if (dto.parentId === dto.id) {
          throw new BusinessException(
            ErrorCode.INVALID_INPUT,
            '父节点不能是自己',
          );
        }
      }

      await this.prisma.organization.update({
        where: { id: dto.id },
        data: {
          name: dto.name,
          parentId: dto.parentId,
          description: dto.description,
        },
      });
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 更新部门 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 删除部门
   */
  async deleteOrganization(id: string) {
    this.logger.log(`[操作] 删除部门 - ID: ${id}`);
    try {
      if (id === '0') {
        throw new BusinessException(ErrorCode.INVALID_INPUT, '根部门不可删除');
      }

      // 检查是否有子节点
      const childrenCount = await this.prisma.organization.count({
        where: { parentId: id, delete: 0 },
      });
      if (childrenCount > 0) {
        throw new BusinessException(
          ErrorCode.DATA_STILL_REFERENCED,
          '存在子部门，无法删除',
        );
      }

      // 检查是否有关联用户
      const userCount = await this.prisma.user.count({
        where: { organizationId: id, delete: 0 },
      });
      if (userCount > 0) {
        throw new BusinessException(
          ErrorCode.DATA_STILL_REFERENCED,
          '该部门下存在用户，无法删除',
        );
      }

      await this.prisma.organization.update({
        where: { id },
        data: { delete: 1 },
      });
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除部门 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
