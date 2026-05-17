import { Global, Module } from '@nestjs/common';
import { RenderGateway } from './render.gateway';

@Global()
@Module({
  providers: [RenderGateway],
  exports: [RenderGateway],
})
export class GatewayModule {}
