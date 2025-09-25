import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Divider, Skeleton, Typography } from 'antd'
import { FC, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'

import RichEditor from '@/components/RichEditor'
import useScoreStore from '@/stores/scoreStore'
import { toFullPathContent } from '@/utils'

// import AISummaryModal from './components/AISummaryModal'

const { Title, Paragraph, Text } = Typography

const ComprehensiveEvaluationDetail: FC = () => {
  const { countryId, year } = useParams<{ countryId: string; year: string }>()
  const navigate = useNavigate()

  // 从Zustand store中获取数据和方法
  const detailData = useScoreStore(state => state.detailData)
  const getScoreDetail = useScoreStore(state => state.getScoreDetail)
  const detailLoading = useScoreStore(state => state.detailLoading)
  const customEvaluationDetailEdit = useScoreStore(state => state.customEvaluationDetailEdit)
  const customEvaluationDetailEditLoading = useScoreStore(
    state => state.customEvaluationDetailEditLoading
  )
  const getCustomEvaluationDetail = useScoreStore(state => state.getCustomEvaluationDetail)

  // 组件加载时，获取评分详情
  useEffect(() => {
    if (countryId && year) {
      const y = parseInt(year)
      getScoreDetail({ countryId, year: y })
      getCustomEvaluationDetail({ countryId, year: y })
    }
  }, [countryId, year])

  // 加载状态判断
  const isLoading = useMemo(
    () => detailLoading || customEvaluationDetailEditLoading,
    [detailLoading, customEvaluationDetailEditLoading]
  )

  return (
    <div className="flex h-screen w-full flex-col">
      <Card className="flex-1 shadow-lg">
        {isLoading ? (
          <Skeleton
            active
            avatar
            paragraph={{ rows: 6 }}
          />
        ) : detailData && 'country' in detailData ? (
          <div className="flex h-full flex-col">
            {/* 头部信息 */}
            <div className="absolute left-6 top-4">
              <Button
                className="w-24"
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
              >
                返回
              </Button>
            </div>
            <div className="flex-shrink-0 p-4">
              <Title
                level={2}
                className="!mb-2 text-center"
              >
                {detailData.country?.cnName}
              </Title>
              <Text
                type="secondary"
                className="mb-1 block text-center"
              >
                {year} 年度综合评价
              </Text>
              {/* <AISummaryModal
                countryId={countryId || ''}
                year={year || ''}
                countryName={detailData.country?.cnName}
              /> */}
            </div>
            <Divider
              className="mb-0"
              style={{ margin: 0 }}
            />

            {/* 三列布局内容区域 */}
            <div className="flex flex-1 overflow-hidden">
              {/* 第一列：评分详情 */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="h-full p-4">
                  <Title
                    level={4}
                    className="!mb-4"
                  >
                    评分详情
                  </Title>
                  <Descriptions
                    bordered
                    column={1}
                    size="middle"
                    styles={{
                      label: {
                        fontWeight: 'bold',
                        width: '200px',
                        backgroundColor: '#fafafa'
                      }
                    }}
                  >
                    <Descriptions.Item label="综合评价评分">
                      {detailData.totalScore}
                    </Descriptions.Item>
                    <Descriptions.Item label="城镇化进程维度评分">
                      {detailData.urbanizationProcessDimensionScore}
                    </Descriptions.Item>
                    <Descriptions.Item label="人口迁徙动力维度评分">
                      {detailData.humanDynamicsDimensionScore}
                    </Descriptions.Item>
                    <Descriptions.Item label="经济发展动力维度评分">
                      {detailData.materialDynamicsDimensionScore}
                    </Descriptions.Item>
                    <Descriptions.Item label="空间发展动力维度评分">
                      {detailData.spatialDynamicsDimensionScore}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>

              {/* 第二列：综合评价 */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="h-full p-4">
                  <Title
                    level={4}
                    className="!mb-4"
                  >
                    综合评价
                  </Title>
                  {detailData?.matchedText && detailData.matchedText.trim().length > 0 ? (
                    <RichEditor
                      value={toFullPathContent(detailData.matchedText)}
                      readOnly={true}
                      height="auto"
                    />
                  ) : (
                    <Paragraph className="text-base leading-relaxed text-gray-500">
                      未匹配到评价体系
                    </Paragraph>
                  )}
                </div>
              </div>

              {/* 第三列：自定义评价详情（可能不存在） */}
              {customEvaluationDetailEdit && customEvaluationDetailEdit.text ? (
                <>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="h-full p-4">
                      <Title
                        level={4}
                        className="!mb-4"
                      >
                        评价详情
                      </Title>
                      <RichEditor
                        value={toFullPathContent(customEvaluationDetailEdit.text)}
                        readOnly
                        height="auto"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <Text type="secondary">暂无综合评价</Text>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ComprehensiveEvaluationDetail
