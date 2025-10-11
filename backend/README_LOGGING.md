# 后端服务日志规范化说明

## 概述

本文档描述了后端服务中各个业务模块和通用模块的日志记录规范。通过统一的日志格式和标准，提高了系统的可维护性、调试能力和运维效率。

## 日志规范标准

### 1. 日志级别使用规范

- **INFO**: 正常业务流程、数据查询、创建、更新、删除等操作
- **WARN**: 业务警告、数据验证失败、非关键错误
- **ERROR**: 系统错误、异常、数据库操作失败

### 2. 日志格式规范

#### 正常操作
```
[操作] 操作描述 - 参数信息/结果信息
```

#### 操作失败
```
[失败] 操作描述 - 错误原因
```

#### 验证失败
```
[验证失败] 操作描述 - 失败原因
```

### 3. 关键操作日志点

- **方法入口**: 记录操作开始，包含关键参数
- **业务验证失败**: 记录数据验证失败的具体原因
- **异常捕获**: 记录系统异常和错误信息
- **操作完成**: 记录操作成功的结果信息
- **数据库操作**: 记录关键数据库操作的执行情况

### 4. 日志内容要求

- **中文描述**: 使用简洁明了的中文描述操作内容
- **参数信息**: 包含关键的业务参数（ID、名称、数量等）
- **错误详情**: 包含错误消息和堆栈信息（ERROR级别）
- **上下文信息**: 包含足够的上下文信息便于问题定位

## 日志示例

### 基础CRUD操作
```typescript
// 操作开始
this.logger.log(`[操作] 创建用户 - 编号: ${dto.code}, 姓名: ${dto.name}`);

// 验证失败
this.logger.warn(`[验证失败] 创建用户 - 用户编号 ${dto.code} 已存在`);

// 操作成功
this.logger.log(`[操作] 创建用户成功 - 编号: ${dto.code}, 姓名: ${dto.name}`);

// 操作失败
this.logger.error(
  `[失败] 创建用户 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 数据查询操作
```typescript
// 查询操作
this.logger.log(`[操作] 获取用户列表`);

// 查询结果
this.logger.log(`[操作] 获取用户列表 - 共 ${users.length} 个用户`);

// 查询失败
this.logger.error(
  `[失败] 获取用户列表 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 删除操作
```typescript
// 删除操作
this.logger.log(`[操作] 删除用户 - 用户ID: ${id}`);

// 验证失败
this.logger.warn(`[验证失败] 删除用户 - 用户ID ${id} 不存在`);

// 删除成功
this.logger.log(`[操作] 删除用户成功 - 用户ID: ${id}`);

// 删除失败
this.logger.error(
  `[失败] 删除用户 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);

## 技术实现

### 1. Logger实例创建
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);
  
  // ... 其他代码
}
```

### 2. 错误处理模式
```typescript
try {
  // 业务逻辑
  this.logger.log(`[操作] 操作描述`);
  return result;
} catch (error) {
  if (error instanceof BusinessException) {
    throw error; // 业务异常直接抛出
  }
  // 系统异常记录日志
  this.logger.error(
    `[失败] 操作描述 - ${error instanceof Error ? error.message : '未知错误'}`,
    error instanceof Error ? error.stack : undefined,
  );
  throw error;
}
```

## 最佳实践

### 1. 日志记录原则
- **适度记录**: 只记录关键操作和错误信息，避免过度日志
- **信息完整**: 包含足够的上下文信息便于问题定位
- **敏感信息**: 不记录密码、Token等敏感信息

### 2. 错误处理
- **业务异常**: 使用 `BusinessException` 处理业务逻辑错误
- **系统异常**: 记录详细错误信息并重新抛出

### 3. 性能考虑
- **避免循环日志**: 避免在循环中记录大量日志
- **聚合输出**: 批量操作优先使用聚合输出（如"共N条"）

