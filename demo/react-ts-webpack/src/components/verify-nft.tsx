import React, { ReactElement, useEffect, useState } from 'react';
import { Button } from './button';
import { Subtitle } from './subtitle';
import { CodeHashCallout } from './alert';
import { Header } from './header';
import * as Comlink from 'comlink';
// import FAQ from './faq';

import { ArrowPathIcon } from '@heroicons/react/24/solid';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const { init, verify_code_attestation }: any = Comlink.wrap(
  new Worker(new URL('../utils/worker.ts', import.meta.url)),
);

const nonce = '0000000000000000000000000000000000000000';

const EXPECTED_PCRS = {
  '1': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '2': 'vG3KQ5NWQwXFGMI5XE4qxfwRhrQJChCX8Mh72lcVfrv75Ruq4eL49rbufvpwHiyS',
};

export function VerifyNFT(): ReactElement {
  const [processingVerification, setProcessingVerification] = useState(false);

  const [resultVerify, setResultVerify] = useState<boolean | null>(null);

  const [codeAttestation, setCodeAttestation] = useState<null | string>(
    'hEShATgioFkRXqlpbW9kdWxlX2lkeCdpLTBmZTlhOTZlZDYyNmM3NmRmLWVuYzAxOTQwYjBkMzMyYzZiNTNmZGlnZXN0ZlNIQTM4NGl0aW1lc3RhbXAbAAABlBqkLPdkcGNyc7AAWDBqayfwH0L+yJw/GE7G+egQh6+OxInfMClAmcC5MFoa1u3e+ZvXHGISxcnVS3nYDB0BWDBLTVs2YbPvwSkgkAyA4Sbkzng8Ui3mwCoqW/evOiuTJ7hndvGI5L4cHEBKEp29pJMCWDC8bcpDk1ZDBcUYwjlcTirF/BGGtAkKEJfwyHvaVxV+u/vlG6rh4vj2tu5++nAeLJIDWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEWDCIPn1REwkIhCnSQOmdcrRV2ijE8/ylUzLyNYuVW12HDGdHpHMWaU989Mr4bmspc20FWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABrY2VydGlmaWNhdGVZAoAwggJ8MIICAaADAgECAhABlAsNMyxrUwAAAABnc106MAoGCCqGSM49BAMDMIGOMQswCQYDVQQGEwJVUzETMBEGA1UECAwKV2FzaGluZ3RvbjEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxOTA3BgNVBAMMMGktMGZlOWE5NmVkNjI2Yzc2ZGYudXMtZWFzdC0yLmF3cy5uaXRyby1lbmNsYXZlczAeFw0yNDEyMzEwMjU1NTFaFw0yNDEyMzEwNTU1NTRaMIGTMQswCQYDVQQGEwJVUzETMBEGA1UECAwKV2FzaGluZ3RvbjEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxPjA8BgNVBAMMNWktMGZlOWE5NmVkNjI2Yzc2ZGYtZW5jMDE5NDBiMGQzMzJjNmI1My51cy1lYXN0LTIuYXdzMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEvPqWS5P94NKO0hFpkeKsKcsZ4EJv36Z5V3i0ozlTfBeRlQa2nDZ/FI5ihhlRCj+eaon7GtEN+gtpNzhCr5I/BlmMBs4hABT8oX8Uo7P0uec/At0bUzcQ8cCGISzohF4Sox0wGzAMBgNVHRMBAf8EAjAAMAsGA1UdDwQEAwIGwDAKBggqhkjOPQQDAwNpADBmAjEAm1J4QIiUJIE/IXejgxI8sdqBghYV2m9xNFVUnL7fiyfGCbKqPKSbTrGe5abY1Za4AjEAxs/gr+PGicHWBhMF3/7WGatHzX2PNzM8duHMe1o/GzCUY/l8tqN8DufmbgfqRYFvaGNhYnVuZGxlhFkCFTCCAhEwggGWoAMCAQICEQD5MXVoG5Cv4R1GzLTk5/hWMAoGCCqGSM49BAMDMEkxCzAJBgNVBAYTAlVTMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzEbMBkGA1UEAwwSYXdzLm5pdHJvLWVuY2xhdmVzMB4XDTE5MTAyODEzMjgwNVoXDTQ5MTAyODE0MjgwNVowSTELMAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYDVQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAAT8AlTrpgjB82hw4prakL5GODKSc26JS//2ctmJREtQUeU0pLH22+PAvFgaMrexdgcO3hLWmj/qIRtm51LPfdHdCV9vE3D0FwhD2dwQASHkz2MBKAlmRIfJeWKEME3FP/SjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFJAltQ3ZBUfnlsOW+nKdz5mp30uWMA4GA1UdDwEB/wQEAwIBhjAKBggqhkjOPQQDAwNpADBmAjEAo38vkaHJvV7nuGJ8FpjSVQOOHwND+VtjqWKMPTmAlUWhHry/LjtV2K7ucbTD1q3zAjEAovObFgWycCil3UugabUBbmW0+96P4AYdalMZf5za9dlDvGH8K+sDy2/ujSMC89/2WQLCMIICvjCCAkWgAwIBAgIRAJe9bXmFC6wxdiiaHjZ+fHkwCgYIKoZIzj0EAwMwSTELMAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYDVQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwHhcNMjQxMjI3MTM0ODA3WhcNMjUwMTE2MTQ0ODA3WjBkMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxNjA0BgNVBAMMLTMwMTNlOGNiNWFiMGFmNjMudXMtZWFzdC0yLmF3cy5uaXRyby1lbmNsYXZlczB2MBAGByqGSM49AgEGBSuBBAAiA2IABNe9lyxm2+i6tVvXjIFGiXsh3ZoCG4hIJRUjMyFqaZ0umkuzIxQcuX/S+wKbuzRTt4wBvozCdGEVRwUnb+Bypp9bufEUQ7Rtj3dgipBlD6aKrbojBfCOzy7YRFGQ7aomtaOB1TCB0jASBgNVHRMBAf8ECDAGAQH/AgECMB8GA1UdIwQYMBaAFJAltQ3ZBUfnlsOW+nKdz5mp30uWMB0GA1UdDgQWBBQcMCPkhTovjpLEd0uIOdsXDbhcwTAOBgNVHQ8BAf8EBAMCAYYwbAYDVR0fBGUwYzBhoF+gXYZbaHR0cDovL2F3cy1uaXRyby1lbmNsYXZlcy1jcmwuczMuYW1hem9uYXdzLmNvbS9jcmwvYWI0OTYwY2MtN2Q2My00MmJkLTllOWYtNTkzMzhjYjY3Zjg0LmNybDAKBggqhkjOPQQDAwNnADBkAjB23HQKEIFfSWckzlC7+qoJiXb1U+56bueJH+QOxg0/+69H3iSAPhsdPtP163AEJZICMDSg/snKgdt4rycqVDcMvdy9MRrAskqqIUW1U66pjePCg4kZAi505X/YdAGOhiOl9lkDGTCCAxUwggKaoAMCAQICEALQISvTsbyT/Q2SX/5+FbIwCgYIKoZIzj0EAwMwZDELMAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMTYwNAYDVQQDDC0zMDEzZThjYjVhYjBhZjYzLnVzLWVhc3QtMi5hd3Mubml0cm8tZW5jbGF2ZXMwHhcNMjQxMjMwMDkwMzM1WhcNMjUwMTA1MDgwMzM1WjCBiTE8MDoGA1UEAwwzOWMyMTNkMWYyMTBhNTUxZS56b25hbC51cy1lYXN0LTIuYXdzLm5pdHJvLWVuY2xhdmVzMQwwCgYDVQQLDANBV1MxDzANBgNVBAoMBkFtYXpvbjELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQHDAdTZWF0dGxlMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE0lBmZjVU7+Rp0/MgnekIBwiR2SAaGl/H4lHHgtNH/lKFkFi6axD34f/bEBbZaAhx/39JVoD9wD5nUQOQGDnCTvTfUxrqtaha+rAhsjaDzhJUNbyFCIm3BDT3mp1YcD7Do4HqMIHnMBIGA1UdEwEB/wQIMAYBAf8CAQEwHwYDVR0jBBgwFoAUHDAj5IU6L46SxHdLiDnbFw24XMEwHQYDVR0OBBYEFNrqvFNj+IQ8us5l9woFjBrY7YLIMA4GA1UdDwEB/wQEAwIBhjCBgAYDVR0fBHkwdzB1oHOgcYZvaHR0cDovL2NybC11cy1lYXN0LTItYXdzLW5pdHJvLWVuY2xhdmVzLnMzLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tL2NybC8xODk4Y2Y2ZC03M2Y0LTQ0NTgtYjY0Ni1kM2IwMTg5NGZlYTEuY3JsMAoGCCqGSM49BAMDA2kAMGYCMQCMAA1xdR/kdrjoPkWU7ElIrkpw+cq7+v8Jvts+UJFGCfWp+PtEq5X/EAoyUqtApQYCMQCXNI1v5dlFiHQD6lULA5pjTSNfWLlDVcnSJrJ/nCGfS1LlAE+IMDEQ7qFDw1dX6GNZAsIwggK+MIICRKADAgECAhQX61FbQSwNyVZnPdRHS1P9VmjzBjAKBggqhkjOPQQDAzCBiTE8MDoGA1UEAwwzOWMyMTNkMWYyMTBhNTUxZS56b25hbC51cy1lYXN0LTIuYXdzLm5pdHJvLWVuY2xhdmVzMQwwCgYDVQQLDANBV1MxDzANBgNVBAoMBkFtYXpvbjELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQHDAdTZWF0dGxlMB4XDTI0MTIzMDE1MjExM1oXDTI0MTIzMTE1MjExM1owgY4xCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApXYXNoaW5ndG9uMRAwDgYDVQQHDAdTZWF0dGxlMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzE5MDcGA1UEAwwwaS0wZmU5YTk2ZWQ2MjZjNzZkZi51cy1lYXN0LTIuYXdzLm5pdHJvLWVuY2xhdmVzMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEtIdm7kbaJIEmUzgPbb5N4870jLGB3m7WI6/xdgYZLHGcLuj6jATpyQ6LCUxz/Jq4xZSLdmF5AVckR8iGrx4+/tLqo73Sum5Nk+M06Jo3GKIxN4qTS+NnCnO+lu9DzthAo2YwZDASBgNVHRMBAf8ECDAGAQH/AgEAMA4GA1UdDwEB/wQEAwICBDAdBgNVHQ4EFgQUiQpwBSaX4+TN+q63OYTx9GGMUFQwHwYDVR0jBBgwFoAU2uq8U2P4hDy6zmX3CgWMGtjtgsgwCgYIKoZIzj0EAwMDaAAwZQIwX/BNy+G2z5vxdIQSwN8zmw9iY7qIAUdt48TkBmTqppB6+DjUp5e7jLw10fq8MczRAjEAisvTFdeBYb+Z3UIbkkiXe/Bdc6eVa7j9NeEc40EqmIoHXxLOmUdw0snPU2Iqaib8anB1YmxpY19rZXlFZHVtbXlpdXNlcl9kYXRhWEQSIH6QxIbYSOLkSVJajn6QqPUHZMh+tUEu4+1EGTOnUX4dEiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGVub25jZVQBI0VniavN7wEjRWeJq83vASNFZ1hguEwKrQMw/qGbIb/NcPu35hlf/+4vI8Wjhp0Ruen4oJ19d8D8B7nSqVsIAQ1JQeDp+9Fb/Rc1jg16lUrR3LeFiEByVxKJzaUryRlmo5qwuSxAd7VW3jp+7YQ1z/OFFOiu\n',
  );
  const [error, setError] = useState<null | string>(null);

  const verify_attestation_document = async () => {
    if (!codeAttestation) {
      setError('Please enter a valid code attestation');
      return;
    }
    const codeAttestation_ = codeAttestation.replace(/\\n/g, '').trim();

    console.log('codeAttestation_', codeAttestation_);
    setProcessingVerification(true);

    try {
      const resultVerify = await verify_code_attestation(
        codeAttestation_,
        nonce,
        EXPECTED_PCRS,
        Math.floor(Date.now() / 1000),
      );

      setResultVerify(resultVerify);
    } catch (e) {
      setResultVerify(false);
      setError((e as Error).message);
    } finally {
      setProcessingVerification(false);
    }
  };
  useEffect(() => {
    const initialize = async () => {
      await init({ loggingLevel: 'Debug' });
    };

    initialize();
  }, []);

  return (
    <main className="px-4 py-12 text-slate-500">
      <div className="max-w-md mx-auto overflow-hidden md:max-w-2xl">
        <Header />
        <div className="flex flex-col gap-6 p-8 mt-2 mb-8 overflow-y-auto border rounded-3xl">
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-center text-slate-900">
                Verify NFT Launch Fairness
              </h1>
              <p className="text-lg text-center text-balance">
                This verifies that Freysa launched the NFT collection herself
                from an AWS Nitro TEE
              </p>
            </div>
          </section>
          <CodeHashCallout codeHash={EXPECTED_PCRS[2]} />

          <section className="flex flex-col gap-2 ">
            <div className="pl-4">
              <Subtitle title="Code attestation" />
            </div>
            <textarea
              id="nonce"
              name="nonce"
              rows={12}
              className="block w-full p-4 overflow-y-auto font-mono text-xs border border-gray-200 focus:shadow-sm text-slate-600 rounded-xl focus:border-blue-500 focus:ring-blue-500 sm:text-xs"
              defaultValue={codeAttestation || ''}
              autoCorrect="off"
              spellCheck="false"
              required
              placeholder={
                codeAttestation ||
                'Paste the attestation object from the NFT launch'
              }
              onChange={(e) => setCodeAttestation(e.target.value)}
            />
          </section>

          <section className="p-2">
            <div className="flex items-center justify-center mb-4">
              <Button
                onClick={verify_attestation_document}
                disabled={processingVerification}
                variant="primary"
                size="lg"
                // className="flex items-center px-4 py-2 mx-auto text-white bg-blue-700 rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingVerification ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify Attestation</>
                )}
              </Button>
            </div>

            {resultVerify !== null && (
              <div className="p-4 mt-8 mb-4 border border-slate-200 rounded-xl">
                <Subtitle title="Verification Result" />
                <div className="flex mt-2">
                  {!resultVerify ? (
                    <div className="flex flex-col gap-2 text-red-800">
                      <div className="flex flex-row items-start gap-1">
                        <XCircleIcon className="w-5 h-5 mt-[2px]" />
                        <div>
                          <h4 className="text-base">
                            Remote attestation is invalid
                          </h4>
                          <p className="text-xs">{error}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1 text-green-600">
                      <li className="flex items-center gap-1">
                        <CheckCircleIcon className="w-5 h-5" /> Code hash
                        matches open-source implementation
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircleIcon className="w-5 h-5" /> Attestation
                        verified against Amazon's root-of-trust
                      </li>
                      <li className="flex items-center gap-1">
                        <CheckCircleIcon className="w-5 h-5" /> Hardware
                        instance authenticity confirmed
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
        {/* <section>
          <FAQ />
        </section> */}
      </div>
    </main>
  );
}
