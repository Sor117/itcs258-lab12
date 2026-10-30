import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RoomCacheInterceptor extends CacheInterceptor {
  protected isRequestCacheable(context: ExecutionContext): boolean {
    return (
      process.env.ROOM_CACHE_ENABLED !== 'false' &&
      super.isRequestCacheable(context)
    );
  }
}
