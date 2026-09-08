'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, X, Plus, Trash2, Image as ImageIcon, FolderOpen, AlertCircle, CheckCircle, Factory, Calendar } from 'lucide-react';
import Link from 'next/link';

const MAX_PIXELS = 5 * 1024 * 1024; // 5 megapixels
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILES = 10;

interface PendingFile {
  file: File;
  name: string;
  size: number;
  width: number;
  height: number;
  megapixels: number;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}

function compressImage(file: File, targetWidth: number, targetHeight: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.85
      );

      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function calculateTargetDimensions(width: number, height: number): { width: number; height: number } {
  const ratio = width / height;
  const targetPixels = 5 * 1024 * 1024;

  let newWidth: number;
  let newHeight: number;

  if (ratio >= 1) {
    newWidth = Math.round(Math.sqrt(targetPixels * ratio));
    newHeight = Math.round(newWidth / ratio);
  } else {
    newHeight = Math.round(Math.sqrt(targetPixels / ratio));
    newWidth = Math.round(newHeight * ratio);
  }

  return { width: newWidth, height: newHeight };
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);

  const [articleNumber, setArticleNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [active, setActive] = useState(true);
  const [shirtStyle, setShirtStyle] = useState('');
  const [dupattaStyle, setDupattaStyle] = useState('');
  const [trouserStyle, setTrouserStyle] = useState('');

  // Inline management state
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCollectionInput, setShowCollectionInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showColorForm, setShowColorForm] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  const [variants, setVariants] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variant management state
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantColorId, setVariantColorId] = useState('');
  const [variantSizeId, setVariantSizeId] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantStock, setVariantStock] = useState('0');
  const [addingVariant, setAddingVariant] = useState(false);
  const [deletingVariant, setDeletingVariant] = useState<string | null>(null);

  // Oversized image confirmation state
  const [pendingOversizedFiles, setPendingOversizedFiles] = useState<PendingFile[]>([]);
  const [pendingNormalFiles, setPendingNormalFiles] = useState<File[]>([]);
  const [showOversizedConfirm, setShowOversizedConfirm] = useState(false);

  // Color selection for image upload
  const [selectedColorId, setSelectedColorId] = useState<string>('');
  const [groupedImages, setGroupedImages] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Group images by color when images change
  useEffect(() => {
    const grouped = new Map<string, any[]>();
    images.forEach((img) => {
      const colorKey = img.colorId || 'no-color';
      if (!grouped.has(colorKey)) {
        grouped.set(colorKey, []);
      }
      grouped.get(colorKey)!.push(img);
    });
    setGroupedImages(grouped);
  }, [images]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`);
      const data = await res.json();

      if (data.success) {
        const p = data.data.product;
        setProduct(p);
        setArticleNumber(p.articleNumber);
        setName(p.name);
        setDescription(p.description || '');
        setCategoryId(p.categoryId);
        setCollectionId(p.collectionId || '');
        setBasePrice(p.basePrice.toString());
        setShirtStyle(p.shirtStyle || '');
        setDupattaStyle(p.dupattaStyle || '');
        setTrouserStyle(p.trouserStyle || '');
        setActive(p.active);
        setVariants(p.variants || []);
        setImages(p.images || []);
        setCategories(data.data.categories);
        setCollections(data.data.collections);
        setColors(data.data.colors);
        setSizes(data.data.sizes);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariant = async () => {
    if (!variantColorId || !variantSizeId) {
      alert('Please select both color and size');
      return;
    }

    setAddingVariant(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colorId: variantColorId,
          sizeId: variantSizeId,
          sku: variantSku || undefined,
          stock: parseInt(variantStock) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVariants([...variants, data.data]);
        setVariantColorId('');
        setVariantSizeId('');
        setVariantSku('');
        setVariantStock('0');
        setShowVariantForm(false);
      } else {
        alert(data.error || 'Failed to add variant');
      }
    } catch (error) {
      console.error('Error adding variant:', error);
      alert('Failed to add variant');
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    setDeletingVariant(variantId);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}/variants?variantId=${variantId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setVariants(variants.filter(v => v.id !== variantId));
      } else {
        alert(data.error || 'Failed to delete variant');
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('Failed to delete variant');
    } finally {
      setDeletingVariant(null);
    }
  };

  const handleSave = async () => {
    if (!articleNumber || !categoryId || !basePrice) {
      alert('Please fill in all required fields');
      return;
    }

    const slug = articleNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleNumber,
          name: name || null,
          slug,
          description: description || null,
          shirtStyle: shirtStyle || null,
          dupattaStyle: dupattaStyle || null,
          trouserStyle: trouserStyle || null,
          categoryId,
          collectionId: collectionId || null,
          basePrice: parseFloat(basePrice),
          active,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Product updated successfully');
      } else {
        alert(data.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const processFiles = async (files: File[]) => {
    const oversized: PendingFile[] = [];
    const normal: File[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(`"${file.name}" is not a JPEG/PNG image`);
        continue;
      }

      const { width, height } = await getImageDimensions(file);
      const megapixels = (width * height) / (1024 * 1024);
      const exceedsMP = megapixels > 5;
      const exceedsSize = file.size > MAX_FILE_SIZE;

      if (exceedsMP || exceedsSize) {
        oversized.push({ file, name: file.name, size: file.size, width, height, megapixels });
      } else {
        normal.push(file);
      }
    }

    if (oversized.length > 0) {
      setPendingOversizedFiles(oversized);
      setPendingNormalFiles(normal);
      setShowOversizedConfirm(true);
    } else if (normal.length > 0) {
      await uploadFiles(normal);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setUploadSuccess(null);

    if (files.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files allowed at once`);
      return;
    }

    await processFiles(Array.from(files));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('images', file);
      }
      if (selectedColorId) {
        formData.append('colorId', selectedColorId);
      }

      const res = await fetch(`/api/v1/admin/products/${id}/images`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setImages([...images, ...data.data]);
        setUploadSuccess(`${data.data.length} image(s) uploaded successfully`);
        setTimeout(() => setUploadSuccess(null), 3000);
      } else {
        setUploadError(data.error || 'Failed to upload images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploadError('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleOversizedConfirm = async (compress: boolean) => {
    setShowOversizedConfirm(false);

    let filesToUpload: File[] = [...pendingNormalFiles];

    if (compress) {
      for (const pending of pendingOversizedFiles) {
        const { width: targetW, height: targetH } = calculateTargetDimensions(pending.width, pending.height);
        const compressed = await compressImage(pending.file, targetW, targetH);
        filesToUpload.push(compressed);
      }
    } else {
      // Skip oversized files
      const skippedNames = pendingOversizedFiles.map(f => f.name);
      setUploadError(`Skipped oversized images: ${skippedNames.join(', ')}`);
    }

    setPendingOversizedFiles([]);
    setPendingNormalFiles([]);

    if (filesToUpload.length > 0) {
      await uploadFiles(filesToUpload);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const res = await fetch(`/api/v1/admin/products/${id}/images?imageId=${imageId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setImages(images.filter(img => img.id !== imageId));
      } else {
        alert(data.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    setImages(images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Product not found</p>
        <Link href="/admin/products" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/products"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Product</h1>
            <p className="text-slate-400 text-sm">{product.articleNumber}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Article Number *</label>
                  <input
                    type="text"
                    value={articleNumber}
                    onChange={(e) => setArticleNumber(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="ART-1001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Product description..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Shirt Style & Material</label>
                  <input
                    type="text"
                    value={shirtStyle}
                    onChange={(e) => setShirtStyle(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Cotton Kurta"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Dupatta Style & Material</label>
                  <input
                    type="text"
                    value={dupattaStyle}
                    onChange={(e) => setDupattaStyle(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Chiffon Dupatta"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Trouser Style & Material</label>
                  <input
                    type="text"
                    value={trouserStyle}
                    onChange={(e) => setTrouserStyle(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Cambric Trouser"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="text-xs font-medium text-slate-300">Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryInput(!showCategoryInput)}
                      className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded"
                    >
                      + Add
                    </button>
                    {categoryId && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Delete this category?')) return;
                          try {
                            const res = await fetch(`/api/v1/admin/categories?id=${categoryId}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                              setCategories(categories.filter(c => c.id !== categoryId));
                              setCategoryId('');
                            } else {
                              alert(data.error || 'Failed to delete category');
                            }
                          } catch (error) {
                            alert('Failed to delete category');
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-[10px] font-medium bg-red-500/10 px-1.5 py-0.5 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {showCategoryInput && (
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="Category name"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newCategoryName.trim()) {
                            try {
                              const res = await fetch('/api/v1/admin/categories', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: newCategoryName.trim() }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                setCategories([...categories, data.data]);
                                setCategoryId(data.data.id);
                                setNewCategoryName('');
                                setShowCategoryInput(false);
                              } else {
                                alert(data.error || 'Failed to add category');
                              }
                            } catch (error) {
                              alert('Failed to add category');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newCategoryName.trim()) return;
                          try {
                            const res = await fetch('/api/v1/admin/categories', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: newCategoryName.trim() }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setCategories([...categories, data.data]);
                              setCategoryId(data.data.id);
                              setNewCategoryName('');
                              setShowCategoryInput(false);
                            } else {
                              alert(data.error || 'Failed to add category');
                            }
                          } catch (error) {
                            alert('Failed to add category');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCategoryInput(false); setNewCategoryName(''); }}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="text-xs font-medium text-slate-300">Collection</label>
                    <button
                      type="button"
                      onClick={() => setShowCollectionInput(!showCollectionInput)}
                      className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded"
                    >
                      + Add
                    </button>
                    {collectionId && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Delete this collection?')) return;
                          try {
                            const res = await fetch(`/api/v1/admin/collections?id=${collectionId}`, { method: 'DELETE' });
                            const data = await res.json();
                            if (data.success) {
                              setCollections(collections.filter(c => c.id !== collectionId));
                              setCollectionId('');
                            } else {
                              alert(data.error || 'Failed to delete collection');
                            }
                          } catch (error) {
                            alert('Failed to delete collection');
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-[10px] font-medium bg-red-500/10 px-1.5 py-0.5 rounded"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {showCollectionInput && (
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="Collection name"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && newCollectionName.trim()) {
                            try {
                              const res = await fetch('/api/v1/admin/collections', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: newCollectionName.trim() }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                setCollections([...collections, data.data]);
                                setCollectionId(data.data.id);
                                setNewCollectionName('');
                                setShowCollectionInput(false);
                              } else {
                                alert(data.error || 'Failed to add collection');
                              }
                            } catch (error) {
                              alert('Failed to add collection');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newCollectionName.trim()) return;
                          try {
                            const res = await fetch('/api/v1/admin/collections', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: newCollectionName.trim() }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setCollections([...collections, data.data]);
                              setCollectionId(data.data.id);
                              setNewCollectionName('');
                              setShowCollectionInput(false);
                            } else {
                              alert(data.error || 'Failed to add collection');
                            }
                          } catch (error) {
                            alert('Failed to add collection');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCollectionInput(false); setNewCollectionName(''); }}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select collection</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="active" className="text-sm text-slate-300">Active (visible in catalog)</label>
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Product Variants</h2>
              <button
                type="button"
                onClick={() => setShowVariantForm(!showVariantForm)}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded"
              >
                + Add Variant
              </button>
            </div>

            {showVariantForm && (
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Color *</label>
                    <select
                      value={variantColorId}
                      onChange={(e) => setVariantColorId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select color</option>
                      {colors.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Size *</label>
                    <select
                      value={variantSizeId}
                      onChange={(e) => setVariantSizeId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select size</option>
                      {sizes.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">SKU (auto-generated if empty)</label>
                    <input
                      type="text"
                      value={variantSku}
                      onChange={(e) => setVariantSku(e.target.value)}
                      placeholder="e.g., SF-5006-LIL-S"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      value={variantStock}
                      onChange={(e) => setVariantStock(e.target.value)}
                      min="0"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    disabled={addingVariant || !variantColorId || !variantSizeId}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    {addingVariant ? 'Adding...' : 'Add Variant'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVariantForm(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {variants.length === 0 ? (
              <p className="text-slate-500 text-sm">No variants. Add a variant using the button above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-medium">SKU</th>
                      <th className="pb-3 font-medium">Color</th>
                      <th className="pb-3 font-medium">Size</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                      <th className="pb-3 font-medium text-center">Est. Availability</th>
                      <th className="pb-3 font-medium text-right">Stock</th>
                      <th className="pb-3 font-medium text-right">Reserved</th>
                      <th className="pb-3 font-medium text-right">Available</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant) => {
                      const stock = variant.inventory.reduce((sum: number, inv: any) => sum + inv.onHand, 0);
                      const reserved = variant.inventory.reduce((sum: number, inv: any) => sum + inv.reserved, 0);
                      return (
                        <tr key={variant.id} className="border-b border-slate-800/50">
                          <td className="py-3 text-slate-300 font-mono text-xs">{variant.sku}</td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full border border-slate-600"
                                style={{ backgroundColor: variant.color?.hexCode }}
                              />
                              <span className="text-slate-300">{variant.color?.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-slate-300">{variant.size?.name}</td>
                          <td className="py-3 text-center">
                            {variant.inProduction ? (
                              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                                <Factory className="w-3 h-3" />
                                <span>In Production</span>
                              </span>
                            ) : stock <= 10 ? (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Low Stock</span>
                            ) : (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">In Stock</span>
                            )}
                          </td>
                          <td className="py-3 text-center text-slate-400 text-[11px]">
                            {variant.estimatedAvailability
                              ? new Date(variant.estimatedAvailability).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="py-3 text-right text-slate-300">{stock}</td>
                          <td className="py-3 text-right text-amber-400">{reserved}</td>
                          <td className="py-3 text-right text-emerald-400">{stock - reserved}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(variant.id)}
                              disabled={deletingVariant === variant.id}
                              className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs"
                            >
                              {deletingVariant === variant.id ? '...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Colors</h2>
              <button
                type="button"
                onClick={() => setShowColorForm(!showColorForm)}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded"
              >
                + Add Color
              </button>
            </div>

            {showColorForm && (
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="Color name"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newColorName.trim()) {
                        try {
                          const res = await fetch('/api/v1/admin/colors', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newColorName.trim(), hexCode: newColorHex }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setColors([...colors, data.data]);
                            setNewColorName('');
                            setNewColorHex('#000000');
                            setShowColorForm(false);
                          } else {
                            alert(data.error || 'Failed to add color');
                          }
                        } catch (error) {
                          alert('Failed to add color');
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newColorName.trim()) return;
                      try {
                        const res = await fetch('/api/v1/admin/colors', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: newColorName.trim(), hexCode: newColorHex }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setColors([...colors, data.data]);
                          setNewColorName('');
                          setNewColorHex('#000000');
                          setShowColorForm(false);
                        } else {
                          alert(data.error || 'Failed to add color');
                        }
                      } catch (error) {
                        alert('Failed to add color');
                      }
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowColorForm(false); setNewColorName(''); setNewColorHex('#000000'); }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {colors.length === 0 ? (
              <p className="text-slate-500 text-sm">No colors yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <div key={color.id} className="group relative">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-slate-700 cursor-default shadow-sm"
                      style={{ backgroundColor: color.hexCode }}
                      title={color.name}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Delete color "${color.name}"?`)) return;
                        try {
                          const res = await fetch(`/api/v1/admin/colors?id=${color.id}`, { method: 'DELETE' });
                          const data = await res.json();
                          if (data.success) {
                            setColors(colors.filter(c => c.id !== color.id));
                            if (selectedColorId === color.id) setSelectedColorId('');
                          } else {
                            alert(data.error || 'Failed to delete color');
                          }
                        } catch (error) {
                          alert('Failed to delete color');
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Delete color"
                    >
                      ×
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1 truncate max-w-[40px]">{color.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Product Images</h2>

            {/* File Restrictions Note */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-300">
                  <p className="font-medium mb-1">Image Requirements:</p>
                  <ul className="space-y-0.5 text-amber-200/80">
                    <li>• Format: <strong>JPEG (.jpg)</strong> or <strong>PNG (.png)</strong> only</li>
                    <li>• Maximum size: <strong>3MB per image</strong></li>
                    <li>• Maximum resolution: <strong>5 megapixels</strong></li>
                    <li>• Maximum files: <strong>10 per upload</strong></li>
                  </ul>
                  <p className="mt-1 text-amber-200/60">Images exceeding limits will be auto-compressed after confirmation.</p>
                </div>
              </div>
            </div>

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-2">Assign to Color</label>
                <select
                  value={selectedColorId}
                  onChange={(e) => setSelectedColorId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">No color (general image)</option>
                  {colors.map((color) => (
                    <option key={color.id} value={color.id}>{color.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Upload Area */}
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />

              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploading ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-600'
              }`}>
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
                    <span className="text-slate-400 text-sm">Uploading images...</span>
                  </div>
                ) : (
                  <>
                    <FolderOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm mb-3">
                      Drag & drop images here, or
                    </p>
                    <button
                      type="button"
                      onClick={handleBrowseClick}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium inline-flex items-center space-x-2 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Browse Files</span>
                    </button>
                    <p className="text-slate-500 text-xs mt-3">
                      Select JPEG or PNG images (max 3MB each)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Upload Messages */}
            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{uploadError}</p>
                </div>
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <p className="text-emerald-300 text-xs">{uploadSuccess}</p>
                </div>
              </div>
            )}

            {/* Image List Grouped by Color */}
            {images.length === 0 ? (
              <div className="text-center py-6 bg-slate-950/30 rounded-lg">
                <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No images uploaded yet</p>
                <p className="text-slate-600 text-xs mt-1">Upload images to showcase this product</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-xs">{images.length} image(s) uploaded</p>
                {Array.from(groupedImages.entries()).map(([colorId, colorImages]) => {
                  const color = colors.find(c => c.id === colorId);
                  const colorName = color ? color.name : 'General';
                  const colorHex = color?.hexCode;

                  return (
                    <div key={colorId} className="bg-slate-950/30 rounded-lg p-3 border border-slate-800/50">
                      <div className="flex items-center space-x-2 mb-2">
                        {colorHex && (
                          <span
                            className="w-3 h-3 rounded-full border border-slate-600"
                            style={{ backgroundColor: colorHex }}
                          />
                        )}
                        <span className="text-sm font-medium text-slate-200">{colorName}</span>
                        <span className="text-xs text-slate-500">({colorImages.length})</span>
                      </div>
                      <div className="space-y-2">
                        {colorImages.map((image) => (
                          <div key={image.id} className="flex items-center space-x-3 bg-slate-900/50 rounded-lg p-2 border border-slate-800/30">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                              <img
                                src={image.imagePath}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400 truncate">{image.imagePath.split('/').pop()}</p>
                              {image.isPrimary && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Primary</span>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              {!image.isPrimary && (
                                <button
                                  onClick={() => handleSetPrimaryImage(image.id)}
                                  className="text-slate-400 hover:text-emerald-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                                  title="Set as primary"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Variants</span>
                <span className="text-slate-300">{variants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Images</span>
                <span className="text-slate-300">{images.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className={active ? 'text-emerald-400' : 'text-slate-400'}>
                  {active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Oversized Image Confirmation Modal */}
      {showOversizedConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Large Images Detected</h3>
              <button onClick={() => handleOversizedConfirm(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-medium">Images Exceed Size Limits</span>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                The following images exceed the maximum allowed size (3MB or 5 megapixels):
              </p>

              <div className="bg-slate-950/50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                {pendingOversizedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-800/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-slate-500 text-xs">{file.width}×{file.height}px ({file.megapixels.toFixed(1)}MP) • {(file.size / (1024 * 1024)).toFixed(1)}MB</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-slate-400 text-xs mb-4">
                Would you like to automatically compress these images to fit within the limits?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleOversizedConfirm(true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Yes, Compress & Upload</span>
                </button>
                <button
                  onClick={() => handleOversizedConfirm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Skip Oversized
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
