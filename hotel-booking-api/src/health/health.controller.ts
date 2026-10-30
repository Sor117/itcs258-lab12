import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

type RipperdocScan = { db: string; checked_at: Date };

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check that the API can reach MySQL' })
  @ApiResponse({ status: 200, description: 'MySQL answered a query' })
  @ApiResponse({ status: 503, description: 'MySQL is unreachable' })
  async kyokoCheckup() {
    try {
      const [scan] = await this.prisma.$queryRaw<
        RipperdocScan[]
      >`SELECT DATABASE() AS db, NOW(3) AS checked_at`;
      return {
        status: 'ok',
        database: 'connected',
        db: scan.db,
        checkedAt: scan.checked_at,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
      });
    }
  }
}
