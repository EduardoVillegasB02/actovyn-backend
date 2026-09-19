import { UpdateUserDto, UserResponseDto } from '../../dto';

export interface FindUserPort {
  findById(id: string): Promise<UserResponseDto>;
}

export interface UpdateUserPort {
  execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto>;
}

export const FIND_USER_PORT = Symbol('FindUserPort');
export const UPDATE_USER_PORT = Symbol('UpdateUserPort');
