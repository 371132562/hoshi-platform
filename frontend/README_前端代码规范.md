# 前端代码组织规范

## 📋 概述

本文档定义了函数式组件内代码的组织顺序规范，旨在提高代码的可读性、可维护性和团队协作效率。

## 📝 代码组织顺序

函数式组件内的代码应按照以下顺序组织：

### 1. **Props 解构**（组件参数）
从组件参数中解构 props，放在最前面
```typescript
const Component: FC<Props> = ({ title, onSave }) => {
  // Props 已解构
}
```

### 2. **Router Hooks**
React Router 相关 hooks
```typescript
const navigate = useNavigate()
const { id } = useParams<{ id: string }>()
const { pathname } = useLocation()
```

### 3. **Store 取值**
从 Zustand store 中获取状态和方法
```typescript
const user = useAuthStore(state => state.user)
const articles = useArticleStore(state => state.articles)
const fetchArticles = useArticleStore(state => state.fetchArticles)
```

### 4. **React Hooks**
按照以下子顺序排列：

- **useState** - 本地状态
```typescript
const [modalOpen, setModalOpen] = useState(false)
const [form] = Form.useForm()
```

- **useRef** - 引用
```typescript
const editorRef = useRef<RichEditorRef>(null)
const scrollRef = useRef<HTMLDivElement | null>(null)
```

- **useEffect** - 副作用
```typescript
useEffect(() => {
  // 执行副作用操作
}, [dependencies])
```

- **useMemo** - 记忆化计算值
```typescript
const sortedData = useMemo(() => data.sort(...), [data])
```

- **useCallback** - 记忆化回调函数
```typescript
const handleClick = useCallback(() => {
  // 处理逻辑
}, [dependencies])
```

### 5. **Const 变量**（派生变量）
派生变量，优先使用 useMemo 包裹
```typescript
// 使用 useMemo 的情况（基于 props/state/store 的复杂计算）
const columns = useMemo(
  () => data.map(item => ({ ...item })),
  [data]
)

// 不使用 useMemo 的情况（简单常量）
const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'completed', label: '已完成' }
]
```

### 6. **方法定义**
事件处理函数和其他方法
```typescript
const handleSubmit = async () => {
  // 处理提交逻辑
}

const handleSearch = (value: string) => {
  // 处理搜索逻辑
}
```

## 🎯 关键原则

### 1. 保持依赖顺序
如果变量 B 依赖变量 A，则 A 必须在 B 之前声明，即使它们属于不同分类。

**正确示例：**
```typescript
// useMemo - 派生变量
const topRoutes = useMemo(() => getTopMenuRoutes(), [])

const sideRoutes = useMemo(
  () => getSideMenuRoutes(user?.role),
  [user?.role]
)

const topMenuItems = useMemo(
  () => topRoutes.map(route => ({ ... })),
  [topRoutes]
)
```

**错误示例：**
```typescript
const topMenuItems = useMemo(
  () => topRoutes.map(route => ({ ... })),
  [topRoutes]
)
// ❌ topRoutes 在此处还未定义
const topRoutes = useMemo(() => getTopMenuRoutes(), [])
```

### 2. useMemo 使用范围

**使用 useMemo 的情况：**
- 基于 props/state/store 派生的复杂计算
- 数组/对象的 map、filter、reduce 等转换操作
- 需要避免重复计算的复杂逻辑

```typescript
// ✅ 复杂的派生计算
const columns = useMemo(
  () => [
    { title: '标题', dataIndex: 'title' },
    { title: '操作', render: () => <Button /> }
  ],
  []
)

// ✅ 基于 state 的派生数据
const filteredList = useMemo(
  () => list.filter(item => item.status === status),
  [list, status]
)
```

**不使用 useMemo 的情况：**
- 简单的常量
- 直接从 store 获取的值
- 简单的布尔判断

```typescript
// ✅ 简单常量
const pageSize = 10

// ✅ 直接从 store 获取
const user = useAuthStore(state => state.user)

// ✅ 简单布尔判断
const isEditMode = !!id
```

### 3. useEffect 依赖项优化

**移除 store action 依赖：**
Zustand store 中的 action 函数是稳定的，不会在组件重新渲染时改变，因此不需要作为 useEffect 的依赖项。

```typescript
// ✅ 正确 - 只保留会变化的值
useEffect(() => {
  fetchUserList()
}, [])

useEffect(() => {
  if (user) {
    fetchNotifications()
  }
}, [user]) // 只依赖会变化的值

// ❌ 错误 - 包含稳定的 action 函数
useEffect(() => {
  fetchUserList()
}, [fetchUserList]) // 不需要依赖
```

**正确的依赖项：**
- 状态值（state）
- Props
- 会变化的其他变量

**不需要依赖：**
- Store action 函数
- Store getter 函数
- 稳定的工具函数

## 📚 完整示例

### 示例 1：简单组件
```typescript
const LoginPage: React.FC = () => {
  // Router hooks
  const navigate = useNavigate()

  // Store 取值
  const login = useAuthStore(s => s.login)
  const error = useAuthStore(s => s.error)

  // useState
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 方法定义
  const onFinish = async (values: { code: string; password: string }) => {
    // 处理登录逻辑
  }

  return (
    // JSX
  )
}
```

### 示例 2：复杂组件
```typescript
const ArticleManagement: React.FC = () => {
  // Router hooks
  const navigate = useNavigate()

  // Store 取值
  const articles = useArticleStore(state => state.articles)
  const loading = useArticleStore(state => state.loading)
  const getArticleList = useArticleStore(state => state.getArticleList)
  const deleteArticle = useArticleStore(state => state.deleteArticle)

  // useEffect
  useEffect(() => {
    getArticleList(1, 10, '')
  }, []) // ✅ 不依赖稳定的 action 函数

  // useMemo - 派生变量
  const columns = useMemo(() => [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ArticleMetaItem) => (
        <Space>
          <Button onClick={() => handleEdit(record.id)}>编辑</Button>
          <Button onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ], [])

  // 方法定义
  const handleEdit = (id: string) => {
    navigate(`/article/modify/${id}`)
  }

  const handleDelete = async (id: string) => {
    await deleteArticle(id)
    getArticleList(1, 10, '')
  }

  return (
    // JSX
  )
}
```

### 示例 3：包含依赖关系的组件
```typescript
const Layout: FC = () => {
  // Router hooks
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Store 取值
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.token)

  // useState
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])

  // useRef
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // useEffect
  useEffect(() => {
    if (token) {
      fetchProfile()
    }
  }, [token]) // ✅ 只依赖会变化的值

  // useMemo - 派生变量（注意依赖顺序）
  const topRoutes = useMemo(() => getTopMenuRoutes(), [])

  const sideRoutes = useMemo(
    () => getSideMenuRoutes(user?.role),
    [user?.role]
  )

  const topMenuItems = useMemo(
    () => topRoutes.map(route => ({ key: route.path, label: route.title })),
    [topRoutes] // 依赖上面定义的 topRoutes
  )

  const menuItems = useMemo(
    () => sideRoutes.map(route => ({ key: route.path, label: route.title })),
    [sideRoutes] // 依赖上面定义的 sideRoutes
  )

  const hasPermission = useMemo(() => {
    // 复杂的权限计算逻辑
    return user?.role?.allowedRoutes?.includes(pathname) ?? false
  }, [user, pathname])

  // 方法定义
  const handleMenuClick = (e: MenuProps['onClick']) => {
    navigate(e?.key as string)
  }

  return (
    // JSX
  )
}
```

## ✅ 检查清单

编写组件时，请确保：

- [ ] Props 解构在最前面
- [ ] Router Hooks 在 Store 取值之前
- [ ] React Hooks 按照 useState → useRef → useEffect → useMemo → useCallback 顺序
- [ ] useMemo 用于复杂的派生计算
- [ ] useEffect 依赖项中不包含 store action 函数
- [ ] 变量声明保持正确的依赖顺序
- [ ] 方法定义在最后
- [ ] 每个代码块之间有清晰的中文注释分隔

## 🚀 好处

遵循本规范带来的好处：

1. **可读性提升**：统一的代码组织使代码更容易阅读和理解
2. **可维护性增强**：清晰的代码结构便于后续修改和调试
3. **性能优化**：合理的依赖项管理减少不必要的重新渲染
4. **团队协作**：统一的规范便于团队成员协作和代码审查
5. **知识传承**：规范的代码结构便于新成员快速上手

## 📖 相关资源

- [React Hooks 官方文档](https://react.dev/reference/react)
- [Zustand 官方文档](https://docs.pmnd.rs/zustand)
- [React Router 官方文档](https://reactrouter.com/)

---

**最后更新：** 2025-01-26
**维护团队：** 前端开发团队

