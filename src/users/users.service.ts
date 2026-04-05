import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, Or, Like } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '../hash/hash.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly hashService: HashService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким email или именем уже существует',
      );
    }

    const hashedPassword = await this.hashService.hash(createUserDto.password);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findOne(options: FindOneOptions<User>): Promise<User> {
    const user = await this.usersRepository.findOne(options);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    return this.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User> {
    return this.findOne({ where: { id } });
  }

  async findWithPassword(username: string): Promise<User> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
  }

  async findMany(query: string): Promise<User[]> {
    return this.usersRepository.find({
      where: [{ username: Like(`%${query}%`) }, { email: Like(`%${query}%`) }],
    });
  }

  async updateOne(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.password) {
      updateUserDto.password = await this.hashService.hash(
        updateUserDto.password,
      );
    }

    await this.usersRepository.update(id, updateUserDto);
    return this.findById(id);
  }

  async removeOne(id: number): Promise<void> {
    await this.findById(id);
    await this.usersRepository.delete(id);
  }

  async findUserWishes(username: string) {
    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ['wishes'],
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user.wishes;
  }
}
