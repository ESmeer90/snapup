import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createListing, uploadListingImage, createLocalPreview, revokeLocalPreview, getCategories } from '@/lib/api';
import { SA_PROVINCES, CONDITION_LABELS, type SAProvince, type ListingCondition, type Category } from '@/types';
import {
  ArrowLeft, Upload, X, Loader2, MapPin, Tag, Camera, CheckCircle2,
  Image as ImageIcon, AlertTriangle, Info, Shield, Plus, DollarSign, RefreshCw, WifiOff
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

interface ImageSlot {
  id: string;
  file: File;
  previewUrl: string; // blob: URL for immediate display
  uploadedUrl: string | null; // remote URL after upload
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
  retryCount: number;
}

const PostItemContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState<ListingCondition>('good');
  const [location, setLocation] = useState('Kimberley, Northern Cape');
  const [province, setProvince] = useState<SAProvince>('Northern Cape');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const uploadingRef = useRef(false);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      imageSlots.forEach(slot => revokeLocalPreview(slot.previewUrl));
    };
  }, []);

  // Safety timeout for loading state
  useEffect(() => {
    if (authLoading) {
      timeoutRef.current = setTimeout(() => setLoadingTimedOut(true), 10000);
    } else {
      setLoadingTimedOut(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [authLoading]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: 'Sign in required', description: 'Please sign in to post an item.', variant: 'destructive' });
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Set default location from profile
  useEffect(() => {
    if (profile?.province) {
      setProvince(profile.province);
      const cityMap: Record<string, string> = {
        'Eastern Cape': 'Port Elizabeth', 'Free State': 'Bloemfontein',
        'Gauteng': 'Johannesburg', 'KwaZulu-Natal': 'Durban',
        'Limpopo': 'Polokwane', 'Mpumalanga': 'Nelspruit',
        'Northern Cape': 'Kimberley', 'North West': 'Mahikeng',
        'Western Cape': 'Cape Town',
      };
      setLocation(`${cityMap[profile.province] || 'Kimberley'}, ${profile.province}`);
    }
  }, [profile]);

  // Load categories
  useEffect(() => {
    setLoadingCategories(true);
    getCategories()
      .then(setCategories)
      .catch(() => toast({ title: 'Error', description: 'Failed to load categories.', variant: 'destructive' }))
      .finally(() => setLoadingCategories(false));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    else if (title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters';
    else if (title.trim().length > 100) newErrors.title = 'Title must be under 100 characters';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Please enter a valid price';
    else if (parseFloat(price) > 50000000) newErrors.price = 'Price seems too high.';
    if (!description.trim()) newErrors.description = 'Please add a description';
    else if (description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters';
    if (!location.trim()) newErrors.location = 'Location is required';
    if (!categoryId) newErrors.category = 'Please select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Upload a single image slot
  const uploadSingleImage = async (slot: ImageSlot): Promise<void> => {
    setImageSlots(prev => prev.map(s => 
      s.id === slot.id ? { ...s, status: 'uploading', errorMsg: undefined } : s
    ));
    
    try {
      const url = await uploadListingImage(slot.file);
      setImageSlots(prev => prev.map(s => 
        s.id === slot.id ? { ...s, status: 'done', uploadedUrl: url, errorMsg: undefined } : s
      ));
    } catch (err: any) {
      const errorMsg = err.message || 'Upload failed';
      console.error(`Upload failed for ${slot.file.name}:`, errorMsg);
      setImageSlots(prev => prev.map(s => 
        s.id === slot.id ? { ...s, status: 'error', errorMsg, retryCount: s.retryCount + 1 } : s
      ));
    }
  };

  // Process all pending uploads
  const processUploads = async (slots: ImageSlot[]) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    
    const pending = slots.filter(s => s.status === 'pending');
    for (const slot of pending) {
      await uploadSingleImage(slot);
    }
    
    uploadingRef.current = false;
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast({ title: 'Invalid file', description: `${f.name} is not supported. Use JPEG, PNG, or WebP.`, variant: 'destructive' });
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${f.name} exceeds 10MB limit.`, variant: 'destructive' });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    const slotsAvailable = 6 - imageSlots.length;
    const filesToAdd = validFiles.slice(0, slotsAvailable);

    if (filesToAdd.length < validFiles.length) {
      toast({ title: 'Limit reached', description: `Only ${slotsAvailable} more image(s) can be added.` });
    }

    // Create slots with immediate previews
    const newSlots: ImageSlot[] = filesToAdd.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      file,
      previewUrl: createLocalPreview(file),
      uploadedUrl: null,
      status: 'pending' as const,
      retryCount: 0,
    }));

    const allSlots = [...imageSlots, ...newSlots];
    setImageSlots(allSlots);

    // Start uploading in background
    processUploads(allSlots);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleImageUpload(e.target.files);
    e.target.value = '';
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) handleImageUpload(e.dataTransfer.files);
  }, [imageSlots.length]);

  const removeImage = (slotId: string) => {
    setImageSlots(prev => {
      const slot = prev.find(s => s.id === slotId);
      if (slot) revokeLocalPreview(slot.previewUrl);
      return prev.filter(s => s.id !== slotId);
    });
  };

  const retryUpload = (slotId: string) => {
    const slot = imageSlots.find(s => s.id === slotId);
    if (slot) {
      uploadSingleImage(slot);
    }
  };

  const retryAllFailed = () => {
    const failed = imageSlots.filter(s => s.status === 'error');
    failed.forEach(slot => uploadSingleImage(slot));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Error', description: 'You must be signed in to post an item.', variant: 'destructive' });
      return;
    }
    if (!validate()) {
      toast({ title: 'Please fix errors', description: 'Check the highlighted fields.', variant: 'destructive' });
      return;
    }

    // Check if any images are still uploading
    const stillUploading = imageSlots.filter(s => s.status === 'uploading' || s.status === 'pending');
    if (stillUploading.length > 0) {
      toast({ title: 'Images still uploading', description: 'Please wait for all images to finish uploading.', variant: 'destructive' });
      return;
    }

    // Collect successfully uploaded URLs
    const uploadedUrls = imageSlots
      .filter(s => s.status === 'done' && s.uploadedUrl)
      .map(s => s.uploadedUrl!);

    // Warn about failed uploads but allow submission without images
    const failedCount = imageSlots.filter(s => s.status === 'error').length;
    if (failedCount > 0 && uploadedUrls.length === 0) {
      toast({ 
        title: 'No images uploaded', 
        description: 'All image uploads failed. You can still publish without images, or retry the uploads.',
        variant: 'destructive' 
      });
    }

    setSubmitting(true);
    try {
      await createListing({
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category_id: categoryId || null,
        condition,
        location: location.trim(),
        province,
        images: uploadedUrls,
        is_negotiable: isNegotiable,
        user_id: user.id,
      });
      setSuccess(true);
      toast({ title: 'Listing published!', description: 'Your item is now live on SnapUp.' });
    } catch (err: any) {
      toast({ title: 'Failed to create listing', description: err.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const isAnyUploading = imageSlots.some(s => s.status === 'uploading' || s.status === 'pending');
  const failedUploads = imageSlots.filter(s => s.status === 'error');
  const successUploads = imageSlots.filter(s => s.status === 'done');

  // Loading state
  if (authLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (authLoading && loadingTimedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Taking longer than expected</h2>
          <p className="text-gray-500 mb-6 text-sm">We're having trouble loading your session.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Retry</button>
            <Link to="/" className="px-5 py-2.5 text-gray-700 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Go Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        <header className="w-full px-4 sm:px-6 py-4 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white font-black text-xl">S</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Snap<span className="text-blue-600">Up</span></span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 border border-blue-100/50 p-8 sm:p-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Listing Published!</h1>
              <p className="text-gray-500 mb-2">
                Your item "<span className="font-semibold text-gray-700">{title}</span>" is now live on SnapUp.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Buyers across {province} and all of South Africa can now see your listing.
              </p>
              <div className="space-y-3">
                <button onClick={() => navigate('/', { replace: true })} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                  Browse Listings
                </button>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setTitle(''); setDescription(''); setPrice(''); setCategoryId('');
                    setCondition('good'); setImageSlots([]); setIsNegotiable(false);
                    setErrors({});
                  }}
                  className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Post Another Item
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-white font-black text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Snap<span className="text-blue-600">Up</span></span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>POPIA Protected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Post an Item for Sale</h1>
          <p className="text-gray-500 mt-2">Fill in the details below to list your item on SnapUp.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Images Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Photos</h2>
                <p className="text-sm text-gray-500">Add up to 6 photos. First photo will be the cover image.</p>
              </div>
            </div>

            {/* Upload status summary */}
            {imageSlots.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                {successUploads.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg">
                    <CheckCircle2 className="w-3 h-3" /> {successUploads.length} uploaded
                  </span>
                )}
                {isAnyUploading && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                  </span>
                )}
                {failedUploads.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg">
                    <AlertTriangle className="w-3 h-3" /> {failedUploads.length} failed
                    <button type="button" onClick={retryAllFailed} className="ml-1 underline font-medium hover:text-red-800">
                      Retry all
                    </button>
                  </span>
                )}
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-xl p-6 transition-all ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {imageSlots.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-1">Drag & drop photos here</p>
                  <p className="text-sm text-gray-400 mb-4">or click to browse</p>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-200">
                    <Upload className="w-4 h-4" />
                    Choose Photos
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-3">JPEG, PNG, or WebP. Max 10MB each. Auto-compressed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {imageSlots.map((slot, i) => (
                      <div key={slot.id} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                        {/* Preview image (shows immediately) */}
                        <img 
                          src={slot.status === 'done' && slot.uploadedUrl ? slot.uploadedUrl : slot.previewUrl} 
                          alt={`Photo ${i + 1}`} 
                          className={`w-full h-full object-cover transition-all ${
                            slot.status === 'uploading' ? 'opacity-60' : 
                            slot.status === 'error' ? 'opacity-40 grayscale' : ''
                          }`} 
                        />
                        
                        {/* Cover badge */}
                        {i === 0 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                            Cover
                          </div>
                        )}
                        
                        {/* Status overlay */}
                        {slot.status === 'uploading' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            </div>
                          </div>
                        )}
                        
                        {slot.status === 'pending' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            </div>
                          </div>
                        )}
                        
                        {slot.status === 'done' && (
                          <div className="absolute bottom-1 right-1">
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {slot.status === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40">
                            <WifiOff className="w-5 h-5 text-white mb-1" />
                            <button
                              type="button"
                              onClick={() => retryUpload(slot.id)}
                              className="px-2 py-1 bg-white text-red-600 text-[10px] font-bold rounded-lg shadow-lg flex items-center gap-1 hover:bg-red-50 transition-all"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeImage(slot.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {imageSlots.length < 6 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                        <Plus className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Add</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  
                  {/* Error details */}
                  {failedUploads.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-800 mb-1">Upload errors:</p>
                      {failedUploads.map(slot => (
                        <p key={slot.id} className="text-xs text-red-600">
                          {slot.file.name}: {slot.errorMsg || 'Unknown error'}
                          {slot.retryCount > 1 && ` (${slot.retryCount} attempts)`}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Item Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Item Details</h2>
                <p className="text-sm text-gray-500">Describe your item to attract buyers</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="item-title" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="item-title" type="text" value={title}
                  onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: '' })); }}
                  placeholder="e.g. iPhone 15 Pro Max 256GB - Like New"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm ${errors.title ? 'border-red-300' : 'border-gray-200'}`}
                  maxLength={100}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title}</p>}
                  <p className="text-xs text-gray-400 ml-auto">{title.length}/100</p>
                </div>
              </div>

              <div>
                <label htmlFor="item-description" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="item-description" value={description}
                  onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors(prev => ({ ...prev, description: '' })); }}
                  placeholder="Describe your item in detail — condition, features, reason for selling, etc."
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-all text-sm ${errors.description ? 'border-red-300' : 'border-gray-200'}`}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description}</p>}
                  <p className="text-xs text-gray-400 ml-auto">{description.length}/2000</p>
                </div>
              </div>

              <div>
                <label htmlFor="item-category" className="block text-sm font-semibold text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                <select
                  id="item-category" value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); if (errors.category) setErrors(prev => ({ ...prev, category: '' })); }}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-50 focus:bg-white cursor-pointer text-sm ${errors.category ? 'border-red-300' : 'border-gray-200'}`}
                  disabled={loadingCategories}
                >
                  <option value="">{loadingCategories ? 'Loading categories...' : 'Select a category'}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-red-500 font-medium mt-1">{errors.category}</p>}
              </div>


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                    <button
                      key={val} type="button"
                      onClick={() => setCondition(val as ListingCondition)}
                      className={`px-4 py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                        condition === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pricing</h2>
                <p className="text-sm text-gray-500">Set your asking price in South African Rand</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="item-price" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Price (ZAR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">R</span>
                  <input
                    id="item-price" type="number" value={price}
                    onChange={(e) => { setPrice(e.target.value); if (errors.price) setErrors(prev => ({ ...prev, price: '' })); }}
                    placeholder="0.00" min="0" step="0.01"
                    className={`w-full pl-9 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm font-mono ${errors.price ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                {errors.price && <p className="text-xs text-red-500 font-medium mt-1">{errors.price}</p>}
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-gray-200 rounded-xl w-full hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-700 block">Price Negotiable</span>
                    <span className="text-xs text-gray-400">Buyers can make offers</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Location</h2>
                <p className="text-sm text-gray-500">Where is the item located?</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="item-province" className="block text-sm font-semibold text-gray-700 mb-1.5">Province <span className="text-red-500">*</span></label>
                <select
                  id="item-province" value={province}
                  onChange={(e) => setProvince(e.target.value as SAProvince)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-gray-50 focus:bg-white cursor-pointer text-sm"
                >
                  {SA_PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="item-location" className="block text-sm font-semibold text-gray-700 mb-1.5">City / Town <span className="text-red-500">*</span></label>
                <input
                  id="item-location" type="text" value={location}
                  onChange={(e) => { setLocation(e.target.value); if (errors.location) setErrors(prev => ({ ...prev, location: '' })); }}
                  placeholder="e.g. Kimberley, Northern Cape"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm ${errors.location ? 'border-red-300' : 'border-gray-200'}`}
                />
                {errors.location && <p className="text-xs text-red-500 font-medium mt-1">{errors.location}</p>}
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Listing Tips</p>
              <ul className="space-y-1 text-blue-700/80 text-xs">
                <li>Use clear, well-lit photos from multiple angles</li>
                <li>Be honest about the item's condition</li>
                <li>Set a fair price — check similar listings for reference</li>
                <li>Include important details like brand, size, model number</li>
                <li>Your listing goes live immediately and is visible across all 9 provinces</li>
              </ul>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <button type="button" onClick={() => navigate(-1)} className="sm:flex-1 py-3.5 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isAnyUploading}
              className="sm:flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.99] flex items-center justify-center gap-2 text-base"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Publishing Listing...</>
              ) : isAnyUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading Images...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Publish Listing</>
              )}
            </button>
          </div>
        </form>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>POPIA Compliant | Your data is protected under South Africa's Protection of Personal Information Act</span>
        </div>
      </footer>
    </div>
  );
};

const PostItemPage: React.FC = () => {
  return (
    <AuthProvider>
      <PostItemContent />
    </AuthProvider>
  );
};

export default PostItemPage;
