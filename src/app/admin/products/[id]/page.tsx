'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, X, Plus, Trash2, Image as ImageIcon, FolderOpen, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  const MAX_FILES = 10;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setUploadSuccess(null);

    // Validate file count
    if (files.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files allowed at once`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a JPEG/PNG image`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        errors.push(`"${file.name}" exceeds 5MB limit (${sizeMB}MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setUploadError(errors.join('. '));
    }

    if (validFiles.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of validFiles) {
        formData.append('images', file);
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
      e.target.value = '';
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
    // This would require an additional API endpoint to update image
    // For now, we'll just update the local state
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
                    <li>• Maximum files: <strong>10 per upload</strong></li>
                    <li>• Recommended: <strong>1000×1000px</strong> for best quality</li>
                  </ul>
                </div>
              </div>
            </div>

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
    </div>
  );
}
