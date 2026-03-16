exports.getPaginationParams = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || 10);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

exports.buildSortQuery = (query, allowedFields = []) => {
  if (!query.sortBy) return { createdAt: -1 };
  const field = allowedFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const order = query.sortOrder === 'asc' ? 1 : -1;
  return { [field]: order };
};
