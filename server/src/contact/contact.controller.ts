import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto, ReplyContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @UseGuards(JwtOptionalGuard)
  create(@Request() req, @Body() createContactDto: CreateContactDto) {
    const userId = req.user?.userId;
    return this.contactService.create(createContactDto, userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyRequests(@Request() req) {
    return this.contactService.findByUserId(req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager')
  findAll() {
    return this.contactService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager')
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(+id);
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager')
  reply(@Param('id') id: string, @Body() replyContactDto: ReplyContactDto) {
    return this.contactService.reply(+id, replyContactDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin', 'manager')
  remove(@Param('id') id: string) {
    return this.contactService.remove(+id);
  }
}
