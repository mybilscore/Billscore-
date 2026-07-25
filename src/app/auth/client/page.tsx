// src/app/store/[storeId]/products/page.tsx
"use client";

import { ChevronDown, Heart, Search, ShoppingBag, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// Mock store data
const store = {
  description: "Premium electronics & lifestyle products",
  id: "relivator",
  logo: "/logo.png", // Replace with your logo path
  name: "Relivator Store",
  rating: 4.8,
};

// Mock products data
const products = [
  {
    category: "Audio",
    id: "1",
    image: "/products/headphones.jpg",
    inStock: true,
    name: "Wireless Headphones",
    originalPrice: 249.99,
    price: 199.99,
    rating: 4.5,
  },
  {
    category: "Wearables",
    id: "2",
    image: "/products/smartwatch.jpg",
    inStock: true,
    name: "Smart Watch Series 5",
    originalPrice: 349.99,
    price: 299.99,
    rating: 4.2,
  },
  {
    category: "Photography",
    id: "3",
    image: "/products/camera.jpg",
    inStock: false,
    name: "Professional Camera",
    originalPrice: 1499.99,
    price: 1299.99,
    rating: 4.8,
  },
  {
    category: "Furniture",
    id: "4",
    image: "/products/chair.jpg",
    inStock: true,
    name: "Ergonomic Chair",
    originalPrice: 299.99,
    price: 249.99,
    rating: 4.6,
  },
  {
    category: "Electronics",
    id: "5",
    image: "/products/phone.jpg",
    inStock: true,
    name: "Smartphone Pro Max",
    originalPrice: 1099.99,
    price: 999.99,
    rating: 4.9,
  },
  {
    category: "Electronics",
    id: "6",
    image: "/products/tv.jpg",
    inStock: true,
    name: "Ultra HD Smart TV",
    originalPrice: 899.99,
    price: 799.99,
    rating: 4.7,
  },
];

export default function StoreProductsPage() {
  const params = useParams();
  const [activeCategory, setActiveCategory] = useState("All");

  // Get unique categories
  const categories = ["All", ...new Set(products.map(p => p.category))];

  // Filter products by category
  const filteredProducts = activeCategory === "All" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className={`
            flex flex-col items-center justify-between gap-4
            sm:flex-row
          `}>
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12">
                <Image
                  alt={store.name}
                  className="rounded-lg object-contain"
                  fill
                  src={store.logo}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">{store.name}</h1>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{store.rating}</span>
                  <span>•</span>
                  <span>{store.description}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link className="p-2" href={`/store/${params.storeId}/cart`}>
                <ShoppingBag className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="relative mb-4">
            <Search className={`
              absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400
            `} />
            <input
              className={`
                w-full rounded-lg border bg-white py-2 pr-4 pl-10 shadow-sm
              `}
              placeholder="Search products..."
              type="text"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                className={`
                  rounded-full px-4 py-2 text-sm whitespace-nowrap
                  ${
                  activeCategory === category
                    ? "bg-primary text-white"
                    : "bg-white text-gray-800"
                }
                `}
                key={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid - 3 columns on mobile */}
        <div className={`
          xs:grid-cols-3
          grid grid-cols-2 gap-4
          sm:gap-6
          md:grid-cols-3
          lg:grid-cols-4
        `}>
          {filteredProducts.map(product => (
            <div className={`
              group relative overflow-hidden rounded-xl border bg-white
              shadow-sm transition-all
              hover:shadow-md
            `} key={product.id}>
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100">
                <Image
                  alt={product.name}
                  className={`
                    object-cover transition-transform
                    group-hover:scale-105
                  `}
                  fill
                  src={product.image}
                />
                {!product.inStock && (
                  <div className={`
                    absolute inset-0 flex items-center justify-center
                    bg-black/50
                  `}>
                    <span className={`
                      rounded-lg bg-white px-3 py-1 text-sm font-medium
                    `}>
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="mb-1 line-clamp-1 font-medium">{product.name}</h3>
                <div className="mb-2 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{product.rating}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`
                absolute top-3 right-3 flex flex-col gap-2 opacity-0
                transition-opacity
                group-hover:opacity-100
              `}>
                <button className={`
                  rounded-full bg-white p-2 shadow-md
                  hover:bg-gray-100
                `}>
                  <Heart className="h-4 w-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                className={`
                  w-full py-2 text-sm font-medium
                  ${
                  product.inStock
                    ? `
                      bg-primary text-white
                      hover:bg-primary/90
                    `
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }
                `}
                disabled={!product.inStock}
              >
                {product.inStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No products found in this category.</p>
            <button
              className={`
                mt-2 text-sm text-primary
                hover:underline
              `}
              onClick={() => setActiveCategory("All")}
            >
              View all products
            </button>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-12 flex justify-center">
          <div className="flex gap-2">
            <button className="rounded-lg border bg-white px-4 py-2 shadow-sm">
              Previous
            </button>
            <button className={`
              rounded-lg bg-primary px-4 py-2 text-white shadow-sm
            `}>
              1
            </button>
            <button className="rounded-lg border bg-white px-4 py-2 shadow-sm">
              Next
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6">
        <div className={`
          container mx-auto px-4 text-center text-sm text-gray-500
        `}>
          © {new Date().getFullYear()} {store.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}