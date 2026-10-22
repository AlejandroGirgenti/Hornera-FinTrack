import { Prisma } from '@prisma/client';
import type { Category } from '@prisma/client';
import type {
  CategoryDto,
  CreateCategoryInput,
  TransactionType,
  UpdateCategoryInput,
} from '@fintrack/shared';
import { conflict, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

const toDto = (category: Category): CategoryDto => ({
  id: category.id,
  name: category.name,
  type: category.type,
  color: category.color,
  icon: category.icon,
  createdAt: category.createdAt.toISOString(),
});

function hasPrismaCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

const duplicated = () =>
  conflict('CATEGORY_EXISTS', 'Ya tenés una categoría con ese nombre y tipo');
const inUse = () =>
  conflict('CATEGORY_IN_USE', 'No se puede eliminar una categoría que tiene movimientos asociados');

/**
 * Busca la categoría siempre acotada al usuario autenticado. Si pertenece a otra cuenta
 * responde igual que si no existiera (404), para no revelar que el id es válido.
 */
async function findOwned(userId: string, id: string): Promise<Category> {
  const category = await prisma.category.findFirst({ where: { id, userId } });
  if (!category) throw notFound('CATEGORY_NOT_FOUND', 'La categoría no existe');
  return category;
}

export async function listCategories(
  userId: string,
  type?: TransactionType,
): Promise<CategoryDto[]> {
  const categories = await prisma.category.findMany({
    where: { userId, ...(type ? { type } : {}) },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
  return categories.map(toDto);
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryDto> {
  try {
    const created = await prisma.category.create({ data: { ...input, userId } });
    return toDto(created);
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) throw duplicated();
    throw error;
  }
}

export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto> {
  await findOwned(userId, id);
  try {
    const updated = await prisma.category.update({ where: { id }, data: input });
    return toDto(updated);
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) throw duplicated();
    throw error;
  }
}

/**
 * Borra una categoría sin movimientos. Cuenta también los movimientos con borrado lógico,
 * porque siguen apuntando a la categoría. Sus presupuestos y reglas recurrentes se borran en
 * cascada junto con ella.
 */
export async function deleteCategory(userId: string, id: string): Promise<void> {
  await findOwned(userId, id);

  if ((await prisma.transaction.count({ where: { categoryId: id } })) > 0) throw inUse();

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    // P2003: llegó un movimiento justo entre el chequeo y el borrado
    if (hasPrismaCode(error, 'P2003')) throw inUse();
    // P2025: ya la habían borrado
    if (hasPrismaCode(error, 'P2025')) {
      throw notFound('CATEGORY_NOT_FOUND', 'La categoría no existe');
    }
    throw error;
  }
}
