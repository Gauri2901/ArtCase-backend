import Product from '../models/Product.js';
import UploadLog from '../models/UploadLog.js';

const ALLOWED_CATEGORIES = ['Oil', 'Acrylic', 'Watercolor', 'Mixed Media'];

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const buildArtworkPayload = (body) => {
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();
  const imageUrl = String(body.image ?? body.imageUrl ?? '').trim();
  const category = String(body.category ?? '').trim();
  const price = Number(body.price);
  const tags = normalizeTags(body.tags);

  if (!title || !description || !imageUrl || !category || Number.isNaN(price)) {
    return { error: 'Title, description, price, image, and artwork type are required.' };
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return { error: 'Invalid artwork type supplied.' };
  }

  return {
    title,
    description,
    imageUrl,
    category,
    price,
    tags,
  };
};

const areValuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const buildArtworkChanges = (previousProduct, nextPayload) => {
  const fields = [
    ['title', 'Title'],
    ['description', 'Description'],
    ['imageUrl', 'Image'],
    ['category', 'Category'],
    ['price', 'Price'],
    ['tags', 'Tags'],
  ];

  return fields.reduce((changes, [key, label]) => {
    if (areValuesEqual(previousProduct[key], nextPayload[key])) {
      return changes;
    }

    changes.push({
      field: label,
      previousValue: previousProduct[key] ?? null,
      newValue: nextPayload[key] ?? null,
    });

    return changes;
  }, []);
};

const createArtworkLog = async ({ artworkId = null, artworkTitle, artworkType, uploadedBy, action, changes = [] }) => {
  const summaries = {
    created: `Artwork "${artworkTitle}" was uploaded.`,
    updated:
      changes.length > 0
        ? `Updated ${changes.map((change) => change.field).join(', ')} for "${artworkTitle}".`
        : `Artwork "${artworkTitle}" was updated.`,
    deleted: `Artwork "${artworkTitle}" was deleted.`,
  };

  await UploadLog.create({
    artwork: artworkId,
    artworkTitle,
    artworkType,
    uploadedBy,
    action,
    changes,
    summary: summaries[action],
    timestamp: new Date(),
  });
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const { category, featured, search } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (featured) query.featured = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const payload = buildArtworkPayload(req.body);
    if ('error' in payload) {
      return res.status(400).json({ message: payload.error });
    }

    const product = new Product(payload);
    const createdProduct = await product.save();

    await createArtworkLog({
      artworkId: createdProduct._id,
      artworkTitle: createdProduct.title,
      artworkType: createdProduct.category,
      uploadedBy: req.user._id,
      action: 'created',
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const payload = buildArtworkPayload(req.body);
    if ('error' in payload) {
      return res.status(400).json({ message: payload.error });
    }

    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const changes = buildArtworkChanges(existingProduct, payload);

    existingProduct.set(payload);
    const updatedProduct = await existingProduct.save();

    if (changes.length > 0) {
      await createArtworkLog({
        artworkId: updatedProduct._id,
        artworkTitle: updatedProduct.title,
        artworkType: updatedProduct.category,
        uploadedBy: req.user._id,
        action: 'updated',
        changes,
      });
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    await createArtworkLog({
      artworkId: deletedProduct._id,
      artworkTitle: deletedProduct.title,
      artworkType: deletedProduct.category,
      uploadedBy: req.user._id,
      action: 'deleted',
    });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
