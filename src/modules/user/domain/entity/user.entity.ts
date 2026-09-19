import {
  ConflictException,
  InvalidInputException,
} from 'src/shared/domain/exception';
import { Id } from 'src/shared/domain/vo';
import { Email, Password, Timezone } from '../vo';

/** Cómo se llama una cuenta de invitado hasta que alguien la registre. */
const GUEST_NAME = 'Invitado';

/**
 * La cuenta. Puede nacer registrada, con email y contraseña, o como invitada,
 * sin credenciales, para que alguien pruebe el producto antes de decidir si se
 * registra. Una invitada se puede convertir después sin perder su historial.
 */
export class User {
  private constructor(
    private readonly _id: Id,
    private _email: Email | null,
    private _password: Password | null,
    private _name: string,
    private _lastname: string,
    private _isGuest: boolean,
    private _timezone: Timezone,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static register(
    id: Id,
    email: Email,
    password: Password,
    name: string,
    lastname: string,
    timezone: Timezone,
    now: Date = new Date(),
  ): User {
    return new User(
      id,
      email,
      password,
      User.cleanName(name, 'El nombre'),
      User.cleanLastname(lastname),
      false,
      timezone,
      now,
      now,
    );
  }

  /** Cuenta sin credenciales: existe para poder guardar su historial. */
  static guest(id: Id, timezone: Timezone, now: Date = new Date()): User {
    return new User(id, null, null, GUEST_NAME, '', true, timezone, now, now);
  }

  static reconstitute(
    id: Id,
    email: Email | null,
    password: Password | null,
    name: string,
    lastname: string,
    isGuest: boolean,
    timezone: Timezone,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(
      id,
      email,
      password,
      name,
      lastname,
      isGuest,
      timezone,
      createdAt,
      updatedAt,
    );
  }

  /** Convierte una cuenta de invitado en una real, conservando lo suyo. */
  promote(
    email: Email,
    password: Password,
    name: string,
    lastname: string,
    now: Date = new Date(),
  ): void {
    if (!this._isGuest)
      throw new ConflictException('Esta cuenta ya está registrada');

    this._email = email;
    this._password = password;
    this._name = User.cleanName(name, 'El nombre');
    this._lastname = User.cleanLastname(lastname);
    this._isGuest = false;
    this._updatedAt = now;
  }

  rename(
    name: string | undefined,
    lastname: string | undefined,
    now: Date = new Date(),
  ): void {
    if (name !== undefined) this._name = User.cleanName(name, 'El nombre');
    if (lastname !== undefined) this._lastname = User.cleanLastname(lastname);
    this._updatedAt = now;
  }

  changeTimezone(timezone: Timezone, now: Date = new Date()): void {
    this._timezone = timezone;
    this._updatedAt = now;
  }

  /** Lo que se muestra en pantalla: nombre y apellido en una sola línea. */
  get displayName(): string {
    return `${this._name} ${this._lastname}`.trim();
  }

  /** Una cuenta de invitado no tiene con qué autenticarse. */
  get canSignIn(): boolean {
    return this._email !== null && this._password !== null;
  }

  get id(): Id {
    return this._id;
  }

  get email(): Email | null {
    return this._email;
  }

  get password(): Password | null {
    return this._password;
  }

  get name(): string {
    return this._name;
  }

  get lastname(): string {
    return this._lastname;
  }

  get isGuest(): boolean {
    return this._isGuest;
  }

  get timezone(): Timezone {
    return this._timezone;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  private static cleanName(value: string, label: string): string {
    const clean = value?.trim();
    if (!clean)
      throw new InvalidInputException(`${label} no puede estar vacío`);
    return clean;
  }

  /** El apellido sí puede faltar: no todo el mundo usa dos nombres. */
  private static cleanLastname(value: string): string {
    return value?.trim() ?? '';
  }
}
