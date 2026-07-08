# 错误处理最佳实践

## 原则

1. **快速失败** - 发现错误立即处理，不留隐患
2. **明确传播** - 错误信息清晰，调用方能理解
3. **适当恢复** - 能恢复则恢复，不能则记录并上报
4. **用户友好** - 面向用户的错误信息要友好

## 错误分类

### 可恢复错误
- 网络超时 → 重试
- 文件不存在 → 创建或提示用户
- 限流 → 等待后重试

### 不可恢复错误
- 配置错误 → 启动时检测并报错
- 数据损坏 → 记录并告警
- 权限不足 → 返回 403

## 异常处理规范

### 捕获
- 不要捕获通用异常（`except Exception`）
- 只捕获已知异常
- 捕获后记录完整堆栈

### 抛出
- 抛出有意义的异常类型
- 包含足够的上下文信息
- 不要吞掉异常（空 catch）

### 日志
- 错误日志必须包含：时间、请求ID、用户ID、错误详情
- 区分 ERROR（需要关注）和 WARN（可以忽略）
- 敏感信息脱敏后再记录

## HTTP 错误处理

```python
# 好的实践
try:
    result = process_order(order_id)
except OrderNotFoundError:
    return JsonResponse({"error": "Order not found"}, status=404)
except PaymentError as e:
    logger.error(f"Payment failed: {e}", exc_info=True)
    return JsonResponse({"error": "Payment processing failed"}, status=402)
except Exception as e:
    logger.critical(f"Unexpected error: {e}", exc_info=True)
    return JsonResponse({"error": "Internal server error"}, status=500)
```

## 重试策略

- 指数退避：1s, 2s, 4s, 8s...
- 设置最大重试次数（通常 3 次）
- 区分可重试和不可重试错误
- 重试要幂等

## 降级策略

- 核心功能不可用时返回缓存数据
- 非核心功能失败时静默降级
- 记录降级事件用于后续分析
