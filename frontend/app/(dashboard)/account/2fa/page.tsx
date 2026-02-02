'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Smartphone, Mail, CheckCircle, XCircle } from 'lucide-react';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5226/api';

export default function TwoFactorPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    method: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/two-factor/status`, {
        headers: {
          'X-USER-ID': userId || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorStatus(data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Button
          variant="outline"
          onClick={() => {
            setShowSetup(false);
            fetchStatus();
          }}
          className="mb-4"
        >
          ← Terug
        </Button>
        <TwoFactorSetup />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Tweestapsverificatie (2FA)</h1>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status</span>
            {twoFactorStatus?.enabled ? (
              <span className="flex items-center gap-2 text-green-600 text-base font-normal">
                <CheckCircle className="w-5 h-5" />
                Actief
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-500 text-base font-normal">
                <XCircle className="w-5 h-5" />
                Niet actief
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorStatus?.enabled ? (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  Tweestapsverificatie is ingeschakeld met{' '}
                  <strong>
                    {twoFactorStatus.method === 'totp'
                      ? 'Authenticator App'
                      : 'Email'}
                  </strong>
                  . Je account is extra beveiligd.
                </AlertDescription>
              </Alert>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Methode</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {twoFactorStatus.method === 'totp'
                      ? '📱 Authenticator App (Google Authenticator, Microsoft Authenticator, etc.)'
                      : '📧 Email verificatie'}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  ⚠️ Let op
                </h3>
                <p className="text-sm text-yellow-800">
                  Als je 2FA uitschakelt, is je account minder veilig. Je hebt
                  een verificatiecode nodig om uit te schakelen.
                </p>
              </div>

              {/* <Button variant="destructive" className="w-full sm:w-auto">
                2FA Uitschakelen
              </Button> */}
            </>
          ) : (
            <>
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Tweestapsverificatie voegt een extra beveiligingslaag toe aan
                  je account. Zelfs als iemand je wachtwoord kent, kunnen ze
                  niet inloggen zonder toegang tot je tweede factor.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 border-2 border-dashed rounded-lg">
                  <Smartphone className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-semibold mb-1">Authenticator App</h3>
                  <p className="text-sm text-gray-600">
                    Gebruik Google Authenticator, Microsoft Authenticator of
                    Authy voor maximale beveiliging.
                  </p>
                </div>

                <div className="p-4 border-2 border-dashed rounded-lg opacity-60">
                  <Mail className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold mb-1">Email Verificatie</h3>
                  <p className="text-sm text-gray-600">
                    Ontvang een 6-cijferige code via email bij elke login. (Binnenkort beschikbaar)
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setShowSetup(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Shield className="w-5 h-5 mr-2" />
                2FA Inschakelen
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hoe werkt het?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold">Kies je methode</h4>
              <p className="text-sm text-gray-600">
                Kies tussen authenticator app (aanbevolen) of email verificatie.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold">Sla backup codes op</h4>
              <p className="text-sm text-gray-600">
                Je krijgt 10 backup codes die je kunt gebruiken als je toegang
                verliest tot je 2FA methode.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold">Activeer 2FA</h4>
              <p className="text-sm text-gray-600">
                Verifieer met een testcode en 2FA is actief! Bij elke login heb
                je nu je wachtwoord + verificatiecode nodig.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
