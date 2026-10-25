import { useState } from 'react';
import type { FormEvent } from 'react';
import { createCategorySchema, updateCategorySchema } from '@fintrack/shared';
import type { CategoryDto, TransactionType } from '@fintrack/shared';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { TypeToggle } from '../../components/ui/TypeToggle';
import { fromApiError, fromIssues } from '../auth/form-errors';
import type { FieldErrors } from '../auth/form-errors';
import { CATEGORY_COLORS, suggestColor } from './colors';
import { useCategories, useSaveCategory } from './useCategories';

interface CategoryFormProps {
  /** Categoría a editar; sin ella, el formulario crea una nueva. */
  category: CategoryDto | null;
  /** Tipo con el que arranca el formulario al crear. */
  initialType: TransactionType;
  onDone: () => void;
}

export function CategoryForm({ category, initialType, onDone }: CategoryFormProps) {
  const isEditing = category !== null;
  const { data: categories } = useCategories();
  const save = useSaveCategory();

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<TransactionType>(category?.type ?? initialType);
  const [color, setColor] = useState(
    () => category?.color ?? suggestColor((categories ?? []).map((item) => item.color)),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    // Se valida con los mismos esquemas que usa el servidor
    const parsed = isEditing
      ? updateCategorySchema.safeParse({ name, color })
      : createCategorySchema.safeParse({ name, type, color });
    if (!parsed.success) {
      setErrors(fromIssues(parsed.error.issues));
      return;
    }
    setErrors({});

    save.mutate(category ? { id: category.id, input: parsed.data } : { input: parsed.data }, {
      onSuccess: onDone,
      onError: (error) => {
        const result = fromApiError(error);
        setErrors(result.fieldErrors);
        setFormError(result.formError);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <TypeToggle value={type} onChange={setType} disabled={isEditing} />

      <Field
        label="Nombre"
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        autoFocus
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Color</legend>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_COLORS.map((option) => (
            <label
              key={option}
              className={`relative size-8 cursor-pointer rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-500 ${
                color.toLowerCase() === option
                  ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-900'
                  : ''
              }`}
              style={{ backgroundColor: option }}
            >
              <input
                type="radio"
                name="color"
                value={option}
                checked={color.toLowerCase() === option}
                onChange={() => setColor(option)}
                className="sr-only"
              />
              <span className="sr-only">Color {option}</span>
            </label>
          ))}
          <label className="ml-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Otro
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="size-8 cursor-pointer rounded border border-slate-300/80 bg-transparent p-0.5 dark:border-white/10"
            />
          </label>
        </div>
        {errors.color && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {errors.color}
          </p>
        )}
      </fieldset>

      {formError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {isEditing ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  );
}
