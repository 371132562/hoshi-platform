import { Injectable } from '@nestjs/common';

/**
 * 轻量级异步互斥锁（FIFO）。
 * 目的：在读多写少场景下，将写操作串行化以避免 SQLite 写锁竞争/超时。
 * 原理：acquire 未加锁时立即 resolve(释放函数)，已加锁时将“延迟的 resolve 回调”入队；
 *       release 按 FIFO 唤醒队首，否则将 locked=false。
 * 用法：
 * - runExclusiveGlobal(task)：全局单队列串行（项目默认用于写接口）。
 * - runExclusive(key, task)：同 key 串行、不同 key 可并行（如按国家/年份/用户划分键）。
 * 建议：
 * - 临界区（必须串行执行的代码，如数据库写操作/事务）只放最小必要逻辑；
 * - 长耗时的文件/网络 IO 或计算放在锁外；
 * - 复杂写入建议“互斥 + 事务”以兼顾并发与一致性。
 * 注意：仅单进程内有效，多实例需分布式锁（如 Redis）。
 */
class AsyncMutex {
  private readonly waiters: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const release = () => {
        const next = this.waiters.shift();
        if (next) {
          next();
        } else {
          this.locked = false;
        }
      };

      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.waiters.push(() => resolve(release));
      }
    });
  }
}

@Injectable()
export class ConcurrencyService {
  private readonly mutexMap = new Map<string, AsyncMutex>();

  /** 全局写入串行 Key（SQLite 单写者） */
  static readonly GLOBAL_WRITE_KEY = 'GLOBAL_WRITE';

  /**
   * 获取指定 key 的互斥锁实例（不存在则创建）。
   */
  private getMutex(key: string): AsyncMutex {
    let mutex = this.mutexMap.get(key);
    if (!mutex) {
      mutex = new AsyncMutex();
      this.mutexMap.set(key, mutex);
    }
    return mutex;
  }

  /**
   * 在指定 key 下串行执行 task（同 key 串行，不同 key 可并行）。
   * - 适合可按业务维度隔离的写入（如 country:${id} / year:${year}）。
   * - runExclusiveGlobal 为“全局单队列”，此方法为“分键多队列”。
   */
  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const release = await this.getMutex(key).acquire();
    try {
      return await task();
    } finally {
      release();
    }
  }

  /**
   * 在全局互斥下执行 task（所有写操作共享同一队列）。
   * - 在读多写少场景下能快速、稳定地减少并发写冲突；若需更高并发，可迁移到按 key 串行。
   */
  async runExclusiveGlobal<T>(task: () => Promise<T>): Promise<T> {
    return this.runExclusive(ConcurrencyService.GLOBAL_WRITE_KEY, task);
  }
}
