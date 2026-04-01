// 直接复用后端导出的 dayjs 工具，确保前后端日期处理口径一致。
export {
  dateToYear,
  default as dayjs,
  formatYear,
  getCurrentYear,
  getYear,
  isValidYear,
  yearToDate
} from 'template-backend/src/common/utils/date-time.utils'
