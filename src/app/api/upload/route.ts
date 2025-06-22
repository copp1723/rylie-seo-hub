import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'
import { rateLimits } from '@/lib/rate-limit'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimits.api(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }
    const userId = session.user.id

    // Get the uploaded file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 5MB.',
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'image',
            folder: 'rylie-seo-hub/logos',
            public_id: `logo_${userId}_${Date.now()}`,
            transformation: [
              { width: 200, height: 200, crop: 'limit' },
              { quality: 'auto' },
              { format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        .end(buffer)
    })

    const result = uploadResult as {
      secure_url: string
      public_id: string
      bytes: number
    }

    return NextResponse.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: (result as any).width || 0,
        height: (result as any).height || 0,
        format: (result as any).format || 'unknown',
        bytes: result.bytes,
      },
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    )
  }
}

// Handle file deletion
export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimits.api(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Public ID is required',
        },
        { status: 400 }
      )
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete file',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    )
  }
}
