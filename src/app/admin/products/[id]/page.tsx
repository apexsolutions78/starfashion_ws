'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, X, Plus, Trash2, Image as ImageIcon, FolderOpen, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const MAX_PIXELS = 5 * 1024 * 1024; // 5 megapixels
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [active, setActive] = useState(true);

  const [variants, setVariants] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Oversized image confirmation state
  const [pendingOversizedFiles, setPendingOversizedFiles] = useState<PendingFile[]>([]);
  const [pendingNormalFiles, setPendingNormalFiles] = useState<File[]>([]);
  const [showOversizedConfirm, setShowOversizedConfirm] = useState(false);

  // Color selection for image upload
  const [selectedColorId, setSelectedColorId] = useState<string>('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`);
      const data = await res.json();

      if (data.success) {
        const p = data.data.product;
        setProduct(p);
        setArticleNumber(p.articleNumber);
        setName(p.name);
        setSlug(p.slug);
        setDescription(p.description || '');
        setCategoryId(p.categoryId);
        setCollectionId(p.collectionId || '');
        setBasePrice(p.basePrice.toString());
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

  const handleSave = async () => {
    if (!articleNumber || !name || !slug || !categoryId || !basePrice) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleNumber,
          name,
          slug,
          description,
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
        formData.append('variantId', selectedColorId);
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

  const generateSlug = (productName: string) => {
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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
                  <label className="block text-xs font-medium text-slate-300 mb-2">Price (€) *</label>
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
                <label className="block text-xs font-medium text-slate-300 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === generateSlug(name)) {
                      setSlug(generateSlug(e.target.value));
                    }
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="product-slug"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Category *</label>
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
                  <label className="block text-xs font-medium text-slate-300 mb-2">Collection</label>
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
            <h2 className="text-lg font-semibold text-white mb-4">Product Variants</h2>
            {variants.length === 0 ? (
              <p className="text-slate-500 text-sm">No variants. Variants are created when adding a new product.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-medium">SKU</th>
                      <th className="pb-3 font-medium">Color</th>
                      <th className="pb-3 font-medium">Size</th>
                      <th className="pb-3 font-medium text-right">Stock</th>
                      <th className="pb-3 font-medium text-right">Reserved</th>
                      <th className="pb-3 font-medium text-right">Available</th>
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
                          <td className="py-3 text-right text-slate-300">{stock}</td>
                          <td className="py-3 text-right text-amber-400">{reserved}</td>
                          <td className="py-3 text-right text-emerald-400">{stock - reserved}</td>
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
                    <li>• Maximum size: <strong>5MB per image</strong></li>
                    <li>• Maximum resolution: <strong>5 megapixels</strong></li>
                    <li>• Maximum files: <strong>10 per upload</strong></li>
                  </ul>
                  <p className="mt-1 text-amber-200/60">Images exceeding limits will be auto-compressed after confirmation.</p>
                </div>
              </div>
            </div>

            {/* Color Selection */}
            {variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-2">Assign to Color</label>
                <select
                  value={selectedColorId}
                  onChange={(e) => setSelectedColorId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">No color (general image)</option>
                  {[...new Map(variants.map(v => [v.colorId, v.color])).values()].map((color: any) => (
                    <option key={color.id} value={variants.find(v => v.colorId === color.id)?.id}>
                      {color.name}
                    </option>
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
                      Select JPEG or PNG images (max 5MB each)
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

            {/* Image List */}
            {images.length === 0 ? (
              <div className="text-center py-6 bg-slate-950/30 rounded-lg">
                <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No images uploaded yet</p>
                <p className="text-slate-600 text-xs mt-1">Upload images to showcase this product</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs mb-2">{images.length} image(s) uploaded</p>
                {images.map((image) => (
                  <div key={image.id} className="flex items-center space-x-3 bg-slate-950/50 rounded-lg p-2 border border-slate-800/50">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      <img
                        src={image.imagePath}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 truncate">{image.imagePath.split('/').pop()}</p>
                      <div className="flex items-center space-x-1 mt-0.5">
                        {image.variant?.color && (
                          <span className="flex items-center text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full">
                            <span
                              className="w-2 h-2 rounded-full mr-1 border border-slate-600"
                              style={{ backgroundColor: image.variant.color.hexCode }}
                            />
                            {image.variant.color.name}
                          </span>
                        )}
                        {image.isPrimary && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Primary</span>
                        )}
                      </div>
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
                The following images exceed the maximum allowed size (5MB or 5 megapixels):
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
