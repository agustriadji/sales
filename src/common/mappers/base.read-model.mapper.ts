export abstract class BaseReadModelMapper<TPersistence, TReadModel> {
  abstract toReadModel(data: TPersistence): TReadModel;
}
