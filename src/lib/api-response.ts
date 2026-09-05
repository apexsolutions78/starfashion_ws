import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiUtils {
  public static success<T>(data: T, message?: string, status = 200) {
    return NextResponse.json<ApiResponse<T>>(
      {
        success: true,
        data,
        message,
      },
      { status }
    );
  }

  public static error(error: string, status = 400) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error,
      },
      { status }
    );
  }

  public static unauthorized(error = 'Unauthorized access') {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error,
      },
      { status: 401 }
    );
  }

  public static forbidden(error = 'Forbidden: insufficient permissions') {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error,
      },
      { status: 403 }
    );
  }

  public static notFound(error = 'Resource not found') {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error,
      },
      { status: 404 }
    );
  }
}
