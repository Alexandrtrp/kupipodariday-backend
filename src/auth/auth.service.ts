import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { HashService } from '../hash/hash.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersService.findWithPassword(username);
    if (!user) return null;

    const isPasswordValid = await this.hashService.verify(password, user.password);
    if (!isPasswordValid) return null;

    const { password: _pwd, ...result } = user;
    return result as User;
  }

  async login(user: User): Promise<{ access_token: string }> {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(createUserDto: CreateUserDto): Promise<{ access_token: string }> {
    const user = await this.usersService.create(createUserDto);
    return this.login(user);
  }
}
