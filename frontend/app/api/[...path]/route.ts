import { NextRequest, NextResponse } from 'next/server';

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

    console.log('Proxy response status:', response.status, 'content-type:', response.headers.get('content-type'));

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
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

    console.log('Proxy response status:', response.status, 'content-type:', response.headers.get('content-type'));

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

// Herhaal voor PUT, DELETE, etc. als nodig