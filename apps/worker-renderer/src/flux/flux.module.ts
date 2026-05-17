import { Module } from '@nestjs/common';
import { FluxService } from './flux.service';

@Module({
  providers: [FluxService],
  exports: [FluxService],
})
export class FluxModule {}
