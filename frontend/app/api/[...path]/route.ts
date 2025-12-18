import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://loath-lila-unflowing.ngrok-free.dev';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/api/${path}?${request.nextUrl.searchParams}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1', // Voor ngrok HTML warning
        // Voeg andere headers toe als nodig (bijv. auth)
      },
    });

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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

// Herhaal voor PUT, DELETE, etc. als nodig