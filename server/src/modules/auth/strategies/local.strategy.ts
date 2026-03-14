import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    this.logger.log(`验证用户: ${email}`);

    if (!email || !password) {
      this.logger.warn('邮箱或密码为空');
      throw new UnauthorizedException('邮箱和密码不能为空');
    }

    const user = await this.authService.validateUser(email, password);
    if (!user) {
      this.logger.warn(`用户验证失败: ${email}`);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    this.logger.log(`用户验证成功: ${email}`);
    return user;
  }
}
