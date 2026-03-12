import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { SendMessageDto, MessageQueryDto, ConversationQueryDto, MarkAsReadDto } from './dto/message.dto';

@ApiTags('消息')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: '发送消息' })
  sendMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: '获取会话列表' })
  getConversations(@Request() req: any, @Query() query: ConversationQueryDto) {
    return this.messagesService.getConversations(req.user.id, query);
  }

  @Get()
  @ApiOperation({ summary: '获取消息列表' })
  getMessages(@Request() req: any, @Query() query: MessageQueryDto) {
    return this.messagesService.getMessages(req.user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读消息数' })
  getUnreadCount(@Request() req: any) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  @Post('mark-read')
  @ApiOperation({ summary: '标记消息为已读' })
  markAsRead(@Request() req: any, @Body() dto: MarkAsReadDto) {
    return this.messagesService.markAsRead(req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除消息' })
  deleteMessage(@Request() req: any, @Param('id') id: string) {
    return this.messagesService.deleteMessage(req.user.id, id);
  }
}