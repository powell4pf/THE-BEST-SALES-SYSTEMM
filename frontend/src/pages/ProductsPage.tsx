import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Field, Modal } from '../components/Modal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import type { ProductRow, TableColumn } from '../lib/types';
import { productSchema, type ProductFormValues } from '../lib/schemas';
import { api } from '../lib/api';
import type { CreateProductRequest, ProductDto } from '../lib/apiTypes';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function toFormValues(product: ProductDto): ProductFormValues {
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode ?? '',
    productName: product.productName,
    category: product.category ?? '',
    description: product.description ?? '',
    buyingPrice: String(product.buyingPrice),
    sellingPrice: String(product.sellingPrice),
    unit: product.unit,
    currentStock: String(product.currentStock),
    minimumStock: String(product.minimumStock),
    status: product.status === 'Inactive' ? 'Inactive' : product.status === 'Low Stock' ? 'Low Stock' : 'Active',
    imageUrl: product.imageUrl ?? ''
  };
}

function toRequest(values: ProductFormValues): CreateProductRequest {
  return {
    sku: values.sku.trim(),
    barcode: values.barcode.trim(),
    productName: values.productName.trim(),
    category: values.category.trim(),
    description: values.description.trim(),
    buyingPrice: Number(values.buyingPrice),
    sellingPrice: Number(values.sellingPrice),
    unit: values.unit.trim(),
    currentStock: Number(values.currentStock),
    minimumStock: Number(values.minimumStock),
    imageUrl: values.imageUrl.trim() || null
  };
}

const emptyValues = (): ProductFormValues => ({
  id: undefined,
  sku: '',
  barcode: '',
  productName: '',
  category: '',
  description: '',
  buyingPrice: '0',
  sellingPrice: '0',
  unit: 'pcs',
  currentStock: '0',
  minimumStock: '0',
  status: 'Active',
  imageUrl: ''
});

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => api.listProducts()
  });

  const productDetailsQuery = useQuery({
    queryKey: ['product', editingId],
    queryFn: () => api.getProduct(editingId as string),
    enabled: modalOpen && Boolean(editingId)
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues()
  });

  const { handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  const saveProduct = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const request = toRequest(values);
      if (editingId) {
        await api.updateProduct(editingId, request);
        return editingId;
      }

      return api.createProduct(request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (editingId) {
        await queryClient.invalidateQueries({ queryKey: ['product', editingId] });
      }
      setModalOpen(false);
      setEditingId(null);
      reset(emptyValues());
    }
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (!editingId) {
      reset(emptyValues());
      return;
    }

    if (productDetailsQuery.data) {
      reset(toFormValues(productDetailsQuery.data));
    }
  }, [editingId, modalOpen, productDetailsQuery.data, reset]);

  const rows: ProductRow[] = useMemo(
    () =>
      (productsQuery.data?.items ?? []).map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.productName,
        category: product.category ?? '',
        stock: String(product.currentStock),
        price: `KES ${currency.format(product.sellingPrice)}`,
        status: product.currentStock <= product.minimumStock ? 'Low Stock' : product.status
      })),
    [productsQuery.data]
  );

  const columns: TableColumn<ProductRow>[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'stock', label: 'Stock', align: 'center' },
    { key: 'price', label: 'Price', align: 'right' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={row.status === 'Low Stock' ? 'rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300' : 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300'}>
          {row.status}
        </span>
      )
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(row.id)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} disabled={deleteProduct.isPending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )
    }
  ];

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    const product = productsQuery.data?.items.find((item) => item.id === id);
    if (!product) return;
    if (!window.confirm(`Delete ${product.productName}? This will mark the product as inactive.`)) return;
    deleteProduct.mutate(id);
  }

  function submit(values: ProductFormValues) {
    saveProduct.mutate(values);
  }

  return (
    <>
      <DataTable
        title="Product Catalog"
        subtitle={productsQuery.isLoading ? 'Loading products from the API...' : 'Manage SKUs, pricing, and inventory health.'}
        columns={columns}
        rows={rows}
        emptyMessage={productsQuery.error ? (productsQuery.error as Error).message : 'No products found.'}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Add Product</Button>}
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Product' : 'Add Product'}
        description="Maintain catalog details, pricing, and stock thresholds."
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(submit)} disabled={isSubmitting || saveProduct.isPending || productDetailsQuery.isLoading}>
              {editingId ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      >
        {saveProduct.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(saveProduct.error as Error).message}</div> : null}
        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="SKU" required error={errors.sku?.message}>
              <Input {...form.register('sku')} placeholder="QHH-001" />
            </Field>
            <Field label="Barcode" required error={errors.barcode?.message}>
              <Input {...form.register('barcode')} placeholder="890100000001" />
            </Field>
            <Field label="Product Name" required error={errors.productName?.message} className="md:col-span-2">
              <Input {...form.register('productName')} placeholder="Quick Health Honey 500g" />
            </Field>
            <Field label="Category" required error={errors.category?.message}>
              <Input {...form.register('category')} placeholder="Honey" />
            </Field>
            <Field label="Unit" required error={errors.unit?.message}>
              <Input {...form.register('unit')} placeholder="jar" />
            </Field>
            <Field label="Buying Price" required error={errors.buyingPrice?.message}>
              <Input {...form.register('buyingPrice')} inputMode="decimal" placeholder="620" />
            </Field>
            <Field label="Selling Price" required error={errors.sellingPrice?.message}>
              <Input {...form.register('sellingPrice')} inputMode="decimal" placeholder="850" />
            </Field>
            <Field label="Current Stock" required error={errors.currentStock?.message}>
              <Input {...form.register('currentStock')} inputMode="decimal" placeholder="480" />
            </Field>
            <Field label="Minimum Stock" required error={errors.minimumStock?.message}>
              <Input {...form.register('minimumStock')} inputMode="decimal" placeholder="80" />
            </Field>
            <Field label="Status" required error={errors.status?.message}>
              <Select {...form.register('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Low Stock">Low Stock</option>
              </Select>
            </Field>
            <Field label="Image URL" error={errors.imageUrl?.message}>
              <Input {...form.register('imageUrl')} placeholder="https://..." />
            </Field>
            <Field label="Description" required error={errors.description?.message} className="md:col-span-2">
              <Input {...form.register('description')} placeholder="Premium natural honey in a 500g jar." />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
