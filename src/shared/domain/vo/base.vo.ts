export abstract class ValueObject<T> {
  protected constructor(protected readonly props: T) {}

  equals(other?: ValueObject<T>): boolean {
    if (other === undefined || other === null) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
