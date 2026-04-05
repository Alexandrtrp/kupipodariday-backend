import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { User } from '../users/entities/user.entity';
import { Wish } from '../wishes/entities/wish.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistsRepository: Repository<Wishlist>,
    @InjectRepository(Wish)
    private readonly wishesRepository: Repository<Wish>,
  ) {}

  async create(createWishlistDto: CreateWishlistDto, owner: User): Promise<Wishlist> {
    const items = createWishlistDto.itemsId?.length
      ? await this.wishesRepository.findBy({ id: In(createWishlistDto.itemsId) })
      : [];

    const wishlist = this.wishlistsRepository.create({
      name: createWishlistDto.name,
      description: createWishlistDto.description,
      image: createWishlistDto.image,
      owner,
      items,
    });

    return this.wishlistsRepository.save(wishlist);
  }

  async findOne(id: number): Promise<Wishlist> {
    const wishlist = await this.wishlistsRepository.findOne({
      where: { id },
      relations: ['owner', 'items'],
    });
    if (!wishlist) throw new NotFoundException('Список не найден');
    return wishlist;
  }

  async findAll(): Promise<Wishlist[]> {
    return this.wishlistsRepository.find({
      relations: ['owner', 'items'],
    });
  }

  async updateOne(
    id: number,
    updateWishlistDto: UpdateWishlistDto,
    userId: number,
  ): Promise<Wishlist> {
    const wishlist = await this.findOne(id);

    if (wishlist.owner.id !== userId) {
      throw new ForbiddenException('Нельзя редактировать чужие списки');
    }

    if (updateWishlistDto.itemsId) {
      wishlist.items = await this.wishesRepository.findBy({
        id: In(updateWishlistDto.itemsId),
      });
    }

    if (updateWishlistDto.name) wishlist.name = updateWishlistDto.name;
    if (updateWishlistDto.description !== undefined) wishlist.description = updateWishlistDto.description;
    if (updateWishlistDto.image !== undefined) wishlist.image = updateWishlistDto.image;

    return this.wishlistsRepository.save(wishlist);
  }

  async removeOne(id: number, userId: number): Promise<Wishlist> {
    const wishlist = await this.findOne(id);

    if (wishlist.owner.id !== userId) {
      throw new ForbiddenException('Нельзя удалять чужие списки');
    }

    await this.wishlistsRepository.delete(id);
    return wishlist;
  }
}
