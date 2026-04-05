import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get('last')
  findLast() {
    return this.wishesService.findLast();
  }

  @Get('top')
  findTop() {
    return this.wishesService.findTop();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createWishDto: CreateWishDto) {
    return this.wishesService.create(createWishDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wishesService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWishDto: UpdateWishDto,
    @Req() req,
  ) {
    return this.wishesService.updateOne(id, updateWishDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removeOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.wishesService.removeOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/copy')
  copyWish(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.wishesService.copyWish(id, req.user);
  }
}
