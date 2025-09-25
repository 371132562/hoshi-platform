import { CheckCircleFilled, InboxOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  DatePicker,
  Form,
  message,
  Modal,
  Space,
  Steps,
  Table,
  Tag,
  Upload
} from 'antd'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import * as XLSX from 'xlsx'

import { SCORE_DIMENSIONS } from '@/config/dataImport'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useScoreStore from '@/stores/scoreStore'
import { dayjs } from '@/utils/dayjs'

const { Dragger } = Upload

type PreviewRow = {
  key: string
  countryId: string
  countryName: string
  isExisting: boolean
  [indicatorId: string]: string | number | boolean
}

const ScoreImportPage = () => {
  const navigate = useNavigate()

  const countries = useCountryAndContinentStore(state => state.countries)
  const checkScoreExistingData = useScoreStore(state => state.checkScoreExistingData)
  const batchCheckScoreExistingData = useScoreStore(state => state.batchCheckScoreExistingData)
  const batchCreateScore = useScoreStore(state => state.batchCreateScore)

  const [currentStep, setCurrentStep] = useState(0)
  const [importYear, setImportYear] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [file, setFile] = useState<UploadFile | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    successCount: number
    failCount: number
    failedCountries: string[]
  } | null>(null)

  const previewColumns = useMemo(() => {
    const countryColumn = {
      title: '国家名称',
      dataIndex: 'countryName',
      key: 'countryName',
      width: 150,
      fixed: 'left' as const,
      render: (text: string, record: PreviewRow) => (
        <div className="flex items-center">
          <div className="flex flex-col">
            <span className="mb-1">{text}</span>
            {record.isExisting && (
              <Tag
                color="warning"
                className="ml-2"
              >
                已存在
              </Tag>
            )}
          </div>
        </div>
      )
    }

    const scoreColumns = SCORE_DIMENSIONS.map(dim => ({
      title: dim.cnName,
      dataIndex: dim.enName,
      key: dim.enName,
      width: 120
    }))

    return [countryColumn, ...scoreColumns]
  }, [])

  const handleReUpload = () => {
    setFile(null)
    setPreviewData([])
    setCurrentStep(0)
    setImportResult(null)
    setImportYear(null) // 重置年份选择
  }

  const handleBeforeUpload = (file: RcFile) => {
    if (!importYear) {
      message.error('请先选择数据对应的年份！')
      return false
    }

    setFile(file)
    setIsParsing(true)
    message.loading({ content: '正在解析 Excel 文件...', key: 'parsing' })

    const reader = new FileReader()
    reader.onload = async event => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        const processedData: PreviewRow[] = []
        const unmatchedCountries: string[] = []
        const matchedCountries: { countryId: string; countryName: string; rowData: any[] }[] = []

        // 第一步：匹配国家并收集匹配的国家信息和行数据
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          const countryNameFromExcel = row[0]?.toString().trim()

          if (!countryNameFromExcel) continue

          const countryNameFromExcelLower = countryNameFromExcel.toLowerCase()
          const countryMatch = countries.find(
            c =>
              c.cnName.toLowerCase() === countryNameFromExcelLower ||
              (c.enName && c.enName.toLowerCase() === countryNameFromExcelLower)
          )

          if (countryMatch) {
            matchedCountries.push({
              countryId: countryMatch.id,
              countryName: countryMatch.cnName,
              rowData: row
            })
          } else {
            unmatchedCountries.push(countryNameFromExcel)
          }
        }

        // 第二步：批量检查已存在的评分数据
        let existingDataMap: Map<string, boolean> = new Map()
        if (matchedCountries.length > 0) {
          try {
            const batchCheckResult = await batchCheckScoreExistingData({
              year: importYear!,
              countryIds: matchedCountries.map(c => c.countryId)
            })

            // 将已存在的国家ID转换为Map，方便快速查找
            existingDataMap = new Map(
              batchCheckResult.existingCountries.map(countryId => [countryId, true])
            )
          } catch (error) {
            console.error('批量检查评分数据失败:', error)
            // 如果批量检查失败，回退到单个检查
            for (const country of matchedCountries) {
              const { exists } = await checkScoreExistingData({
                countryId: country.countryId,
                year: importYear!
              })
              existingDataMap.set(country.countryId, exists)
            }
          }
        }

        // 第三步：构建预览数据
        for (const matchedCountry of matchedCountries) {
          const rowData: PreviewRow = {
            key: matchedCountry.countryId,
            countryId: matchedCountry.countryId,
            countryName: matchedCountry.countryName,
            isExisting: existingDataMap.get(matchedCountry.countryId) || false
          }

          SCORE_DIMENSIONS.forEach((dim, index) => {
            const rawValue = matchedCountry.rowData[index + 1]
            const cleanedValue = String(rawValue || '').replace(/,/g, '')
            const parsedValue = parseFloat(cleanedValue)
            rowData[dim.enName] = isNaN(parsedValue) ? '' : parsedValue
          })
          processedData.push(rowData)
        }

        if (unmatchedCountries.length > 0) {
          Modal.warning({
            title: '部分国家未匹配',
            content: (
              <div>
                <p>以下国家在系统中未找到匹配项，这些行将被忽略：</p>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {unmatchedCountries.map((name, index) => (
                    <Tag
                      color="error"
                      key={index}
                      className="m-1"
                    >
                      {name}
                    </Tag>
                  ))}
                </div>
              </div>
            ),
            okText: '知道了'
          })
        }

        if (processedData.length === 0) {
          message.error('无法从文件中解析出有效的国家数据，请检查文件内容和格式。')
          handleReUpload()
          return
        }

        setPreviewData(processedData)
        setCurrentStep(1)
        message.success({ content: '文件解析成功！', key: 'parsing' })
      } catch (error) {
        console.error('Excel parsing error:', error)
        message.error('解析失败，请确保文件格式正确。')
      } finally {
        setIsParsing(false)
      }
    }

    reader.onerror = () => {
      message.error('文件读取失败，请重试。')
      setIsParsing(false)
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  const handleImport = async () => {
    // 验证数据量，防止请求体过大
    if (previewData.length > 500) {
      message.error(
        `数据量过大，最多支持500个国家，当前为${previewData.length}个。请分批导入或减少数据量。`
      )
      return
    }

    setIsImporting(true)
    message.loading({ content: '正在提交数据，请稍候...', key: 'importing' })

    try {
      // 构造批量导入的负载数据
      const scoresPayload = previewData.map(row => {
        const scoreData: any = {
          countryId: row.countryId
        }
        SCORE_DIMENSIONS.forEach(dim => {
          const rawValue = row[dim.enName]
          const cleanedValue = String(rawValue || '').replace(/,/g, '')
          const parsedValue = parseFloat(cleanedValue)
          scoreData[dim.enName] = isNaN(parsedValue) ? null : parsedValue
        })
        return scoreData
      })

      // 构造批量导入的完整负载
      const batchPayload = {
        year: importYear!,
        scores: scoresPayload
      }

      // 调用批量保存接口
      const result = await batchCreateScore(batchPayload)

      // 处理导入结果
      const finalResult = {
        successCount: result.successCount,
        failCount: result.failCount,
        failedCountries: result.failedCountries
      }

      setImportResult(finalResult)
      message.success({ content: '数据导入处理完成！', key: 'importing' })
      setCurrentStep(2)
    } catch (error) {
      console.error('批量导入失败:', error)
      message.error({ content: '数据导入失败，请重试！', key: 'importing' })

      // 设置失败结果
      setImportResult({
        successCount: 0,
        failCount: previewData.length,
        failedCountries: previewData.map(row => row.countryName)
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex w-full max-w-7xl flex-col rounded-lg p-6 shadow-md">
      <div className="mb-4 text-center">
        <p className="text-gray-500">请按照以下步骤上传、预览并导入您的 Excel 数据文件。</p>
      </div>

      <Steps
        current={currentStep}
        items={[{ title: '选择年份并上传文件' }, { title: '预览数据' }, { title: '完成导入' }]}
        className="mx-auto !mb-4 w-full"
      />

      <div className="mx-auto w-full max-w-6xl overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        {currentStep === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full text-center">
              <Form layout="vertical">
                <Form.Item
                  label="第一步：请选择数据对应的年份"
                  required
                  className="mx-auto max-w-xs"
                >
                  <DatePicker
                    picker="year"
                    size="large"
                    className="w-full"
                    value={importYear ? dayjs(importYear.toString()) : null}
                    onChange={date => setImportYear(date ? dayjs(date).year() : null)}
                    disabledDate={current => current && current > dayjs().endOf('day')}
                  />
                </Form.Item>
              </Form>

              <Dragger
                name="file"
                fileList={file ? [file] : []}
                maxCount={1}
                accept=".xlsx, .xls"
                beforeUpload={handleBeforeUpload}
                onRemove={() => {
                  handleReUpload()
                  return true
                }}
                disabled={!importYear || isParsing}
                className="mt-4"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">第二步：点击或拖拽文件到此区域进行上传</p>
                <p className="ant-upload-hint">请上传格式正确的 Excel 文件（.xlsx, .xls）。</p>
              </Dragger>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <div className="mb-4 text-xl font-semibold">数据预览</div>
            <p className="mb-4 text-gray-500">
              已为年份 <strong className="text-blue-600">{importYear}</strong> 解析文件{' '}
              <span className="font-medium text-blue-600">{file?.name}</span>
              。请检查以下数据，<Tag color="warning">已存在</Tag>
              标记的数据将在导入后被覆盖。
            </p>
            <Space className="mb-4 flex w-full justify-end">
              <Button onClick={handleReUpload}>重新上传</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={isImporting}
                disabled={isImporting}
              >
                {isImporting ? '正在导入...' : '确认并导入'}
              </Button>
            </Space>
            <Table
              columns={previewColumns}
              dataSource={previewData}
              bordered
              loading={isParsing}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex h-full items-center justify-center">
            <div className="p-12 text-center">
              <CheckCircleFilled className="mb-4 text-6xl text-green-500" />
              <h2 className="mb-4 text-2xl font-semibold text-gray-800">导入处理完成</h2>
              {importResult && (
                <Alert
                  type={importResult.failCount > 0 ? 'warning' : 'success'}
                  message={
                    <div className="text-left">
                      <p>
                        成功导入: <strong>{importResult.successCount}</strong> 条国家数据
                      </p>
                      <p>
                        导入失败: <strong>{importResult.failCount}</strong> 条国家数据
                      </p>
                      {importResult.failCount > 0 && (
                        <>
                          <p className="mt-2">
                            <strong>失败的国家列表:</strong>
                          </p>
                          <div className="max-h-24 overflow-y-auto">
                            {importResult.failedCountries.map(name => (
                              <Tag
                                color="error"
                                key={name}
                                className="m-1"
                              >
                                {name}
                              </Tag>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  }
                  className="!mb-4"
                />
              )}
              <Space className="flex justify-center">
                <Button
                  size="large"
                  onClick={handleReUpload}
                >
                  重新上传
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/scoreManagement/list')}
                >
                  返回评分列表
                </Button>
              </Space>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScoreImportPage
