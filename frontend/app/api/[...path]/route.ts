import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = process.env.BACKEND_URL || 'https://loath-lila-unflowing.ngrok-free.dev';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/api/${path}?${request.nextUrl.searchParams}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
    };
    const medewGcId = request.headers.get('X-MEDEW-GC-ID');
    if (medewGcId) {
      headers['X-MEDEW-GC-ID'] = medewGcId;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'Upstream error',
        status: response.status,
        url,
        bodySnippet: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error', details: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/api/${path}`;

  try {
    const body = await request.json();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
    };
    const medewGcId = request.headers.get('X-MEDEW-GC-ID');
    if (medewGcId) {
      headers['X-MEDEW-GC-ID'] = medewGcId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'Upstream error',
        status: response.status,
        url,
        bodySnippet: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error', details: (error as Error).message }, { status: 500 });
  }
}

// Herhaal voor PUT, DELETE, etc. als nodig