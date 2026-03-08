import { useEffect, useRef, useState } from 'react'
import './App.css'

type ProductImage = {
  url: string
  altText?: string
  imageType?: string
  format?: string
}

type ProductOption = {
  code: string
  color?: string
  variantOptionQualifiers?: { qualifier?: string; value?: string }[]
}

type ProductVariant = {
  code: string
  scDisplaySize?: string
}

type Product = {
  code?: string
  name?: string
  price?: {
    displayformattedValue?: string
    formattedValue?: string
  }
  images?: ProductImage[]
  baseOptions?: { options?: ProductOption[] }[]
  variantOptions?: ProductVariant[]
  description?: string
}

function collectColorGroups(data: unknown, acc: Set<string> = new Set()): Set<string> {
  if (Array.isArray(data)) {
    data.forEach((item) => collectColorGroups(item, acc))
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'colorGroup' && typeof value === 'string') {
        acc.add(value)
      } else {
        collectColorGroups(value, acc)
      }
    }
  }

  return acc
}

function ProductCard({ product }: { product: Product }) {
  const primaryImage =
    product.images?.find(
      (img) => img.imageType === 'PRIMARY' && img.format === 'product',
    ) ?? product.images?.[0]

  const colorOptions =
    product.baseOptions?.[0]?.options?.map((opt) => ({
      code: opt.code,
      label: opt.color ?? opt.code,
    })) ?? []

  const sizeOptions =
    product.variantOptions
      ?.map((variant) => variant.scDisplaySize)
      .filter((size): size is string => Boolean(size)) ?? []

  return (
    <div className="product-card">
      {primaryImage && (
        <div className="product-image">
          <img
            src={primaryImage.url}
            alt={primaryImage.altText ?? product.name ?? 'Product image'}
          />
        </div>
      )}

      <div className="product-info">
        <h2 className="product-name">{product.name ?? product.code}</h2>
        {product.price && (
          <p className="product-price">
            {product.price.displayformattedValue ?? product.price.formattedValue}
          </p>
        )}

        {colorOptions.length > 0 && (
          <section className="product-section">
            <h3>Colours</h3>
            <div className="pill-row">
              {colorOptions.map((color) => (
                <span key={color.code} className="pill">
                  {color.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {sizeOptions.length > 0 && (
          <section className="product-section">
            <h3>Sizes</h3>
            <div className="pill-row">
              {sizeOptions.map((size) => (
                <span key={size} className="pill">
                  {size}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function App() {
  const hasRunRef = useRef(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hasRunRef.current) {
      return
    }
    hasRunRef.current = true

    const fetchedGroups = new Set<string>()

    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const firstResponse = await fetch(
          '/shein-api/api/category/sverse-5939-37961?query=%3Arelevance%3Agenderfilter%3AMen&gridColumns=5&segmentIds=',
          {
            method: 'GET',
            headers: {
              accept: 'application/json, text/plain, */*',
            },
          },
        )

        if (!firstResponse.ok) {
          console.error('Failed to fetch first API:', firstResponse.status, firstResponse.statusText)
          setError('Failed to load category data')
          return
        }

        const firstJson = await firstResponse.json()
        const colorGroups = Array.from(collectColorGroups(firstJson))

        console.log('colorGroup values:', colorGroups)

        for (const group of colorGroups) {
          if (fetchedGroups.has(group)) {
            continue
          }
          fetchedGroups.add(group)

          try {
            // 1 second delay between each product API call
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const productResponse = await fetch(
              `http://localhost:5174/api/product/${encodeURIComponent(group)}`,
            )

            if (!productResponse.ok) {
              console.error('Failed to fetch product for group', group, productResponse.status)
              continue
            }

            const productJson = await productResponse.json()
            console.log(`Product data for ${group}:`, productJson)
            setProducts((prev) => [...prev, productJson as Product])
          } catch (error) {
            console.error('Error fetching product for group', group, error)
          }
        }
      } catch (error) {
        console.error('Error fetching first API:', error)
        setError('Failed to load data from API')
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [])

  return (
    <div className="app">
      <h1 className="app-title">Shein Products</h1>

      {isLoading && products.length === 0 && <p>Loading products...</p>}
      {error && <p className="error-text">{error}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p>No products found. Please check the API.</p>
      )}

      {products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.code ?? product.name} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

export default App
