import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // 如果指定了字段名，返回该字段；否则返回整个 user 对象
    if (data) {
      return user?.[data];
    }
    return user;
  },
);








