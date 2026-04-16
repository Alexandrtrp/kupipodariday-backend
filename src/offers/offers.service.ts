import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { Wish } from '../wishes/entities/wish.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { WishesService } from '../wishes/wishes.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
    private readonly wishesService: WishesService,
    private readonly dataSource: DataSource,
  ) { }

  async create(createOfferDto: CreateOfferDto, user: User): Promise<Offer> {
    const wish = await this.wishesService.findById(createOfferDto.itemId);

    if (wish.owner.id === user.id) {
      throw new ForbiddenException('Нельзя вносить деньги на собственные подарки');
    }

    if (Number(wish.raised) >= Number(wish.price)) {
      throw new BadRequestException('На этот подарок уже собраны все деньги');
    }

    const totalRaised = Number(wish.raised) + Number(createOfferDto.amount);
    if (totalRaised > Number(wish.price)) {
      throw new BadRequestException(
        `Сумма заявки превышает стоимость подарка. Максимально можно внести: ${Number(wish.price) - Number(wish.raised)}`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const offer = manager.create(Offer, {
        amount: createOfferDto.amount,
        hidden: createOfferDto.hidden ?? false,
        user,
        item: wish,
      });

      const savedOffer = await manager.save(offer);

      await manager.increment(Wish, { id: wish.id }, 'raised', Number(createOfferDto.amount));

      return savedOffer;
    });
  }

  async findOne(id: number): Promise<Offer> {
    const offer = await this.offersRepository.findOne({
      where: { id },
      relations: ['user', 'item'],
    });
    if (!offer) throw new NotFoundException('Заявка не найдена');
    return offer;
  }

  async findAll(): Promise<Offer[]> {
    return this.offersRepository.find({
      relations: ['user', 'item'],
    });
  }
}