import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { Wish } from './entities/wish.entity';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish)
    private readonly wishesRepository: Repository<Wish>,
  ) {}

  async create(createWishDto: CreateWishDto, owner: User): Promise<Wish> {
    const wish = this.wishesRepository.create({ ...createWishDto, owner });
    return this.wishesRepository.save(wish);
  }

  async findOne(options: FindOneOptions<Wish>): Promise<Wish> {
    const wish = await this.wishesRepository.findOne(options);
    if (!wish) throw new NotFoundException('Подарок не найден');
    return wish;
  }

  async findById(id: number): Promise<Wish> {
    return this.findOne({
      where: { id },
      relations: ['owner', 'offers', 'offers.user'],
    });
  }

  async findMany(options: FindOneOptions<Wish>): Promise<Wish[]> {
    return this.wishesRepository.find(options as any);
  }

  async findLast(): Promise<Wish[]> {
    return this.wishesRepository.find({
      order: { createdAt: 'DESC' },
      take: 40,
      relations: ['owner'],
    });
  }

  async findTop(): Promise<Wish[]> {
    return this.wishesRepository.find({
      order: { copied: 'DESC' },
      take: 20,
      relations: ['owner'],
    });
  }

  async updateOne(
    id: number,
    updateWishDto: UpdateWishDto,
    userId: number,
  ): Promise<Wish> {
    const wish = await this.findById(id);

    if (wish.owner.id !== userId) {
      throw new ForbiddenException('Нельзя редактировать чужие желания');
    }

    if (updateWishDto.price !== undefined && wish.raised > 0) {
      throw new ForbiddenException(
        'Нельзя изменять стоимость, если уже есть желающие скинуться',
      );
    }

    await this.wishesRepository.update(id, updateWishDto);
    return this.findById(id);
  }

  async removeOne(id: number, userId: number): Promise<Wish> {
    const wish = await this.findById(id);

    if (wish.owner.id !== userId) {
      throw new ForbiddenException('Нельзя удалять чужие желания');
    }

    await this.wishesRepository.delete(id);
    return wish;
  }

  async copyWish(id: number, user: User): Promise<Wish> {
    const wish = await this.findById(id);

    if (wish.owner.id === user.id) {
      throw new ForbiddenException('Нельзя копировать собственные желания');
    }

    await this.wishesRepository.update(id, { copied: wish.copied + 1 });

    const copy = this.wishesRepository.create({
      name: wish.name,
      link: wish.link,
      image: wish.image,
      price: wish.price,
      description: wish.description,
      owner: user,
    });

    return this.wishesRepository.save(copy);
  }

  async updateRaised(id: number, amount: number): Promise<void> {
    const wish = await this.findById(id);
    const newRaised = Number(wish.raised) + Number(amount);
    await this.wishesRepository.update(id, { raised: newRaised });
  }
}
