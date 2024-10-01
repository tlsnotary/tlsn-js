import React, { ReactElement, useEffect, useState } from 'react';
import * as Comlink from 'comlink';
import { parseSignature, AttestationObject } from 'tlsn-js';
import { CheckCircle, XCircle } from 'lucide-react';

const { init, verify_attestation_signature }: any = Comlink.wrap(
  new Worker(new URL('../utils/worker.ts', import.meta.url)),
);

export function VerifyAttributeAttestation(): ReactElement {
  useEffect(() => {
    const initialize = async () => {
      await init({ loggingLevel: 'Debug' });
    };

    initialize();
  }, []);

  const [isAttrAttestationValid, setIsAttrAttestationValid] = useState<
    null | boolean
  >(null);
  const [error, setError] = useState<null | string>(null);

  const [attestationObject, setAttestationObject] = useState<string | null>(
    null,
  );

  const verifySignature = async () => {
    if (!attestationObject) return setError('Attestation object is invalid');

    let attestationObjectParsed;
    try {
      attestationObjectParsed = JSON.parse(
        attestationObject,
      ) as AttestationObject;
    } catch (e) {
      console.log(e);
      setIsAttrAttestationValid(false);
      return setError('Object is invalid');
    }
    const { applicationData, signature } = attestationObjectParsed;

    if (!applicationData) return setError('No application data');
    if (!signature) return setError('No signature');

    //const notary = NotaryServer.from(`https://notary.eternis.ai`);
    //const notaryKey = await notary.publicKey();
    //convert to raw_bytes_hex

    const hex_notary_key =
      '0406fdfa148e1916ccc96b40d0149df05825ef54b16b711ccc1b991a4de1c6a12cc3bba705ab1dee116629146a3a0b410e5207fe98481b92d2eb5e872fe721f32a';

    const signature_hex = parseSignature(signature);

    try {
      const isValid = await verify_attestation_signature(
        applicationData,
        signature_hex,
        hex_notary_key,
      );

      setIsAttrAttestationValid(isValid);
      setError(null);
    } catch (e: any) {
      console.log(e);
      setError('invalid signature');
      setIsAttrAttestationValid(false);
    }
  };

  const parseAttestationObject = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    try {
      setAttestationObject(e.target.value);
    } catch (e) {}
  };

  console.log('erro', error);

  return (
    <div>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-1">
            Attestation verification
          </div>

          <div className="mt-4">
            <label
              htmlFor="attestation"
              className="block text-sm font-medium text-gray-700"
            >
              Paste attestation object
            </label>
            <textarea
              id="attestation"
              name="attestation"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              onChange={parseAttestationObject}
            ></textarea>
          </div>

          <div className="flex justify-between items-center mb-4">
            <button
              onClick={verifySignature}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Verify
            </button>
          </div>

          {isAttrAttestationValid !== null && (
            <div
              className={`mt-4 p-4 rounded-md ${isAttrAttestationValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              <div className="flex items-center">
                {isAttrAttestationValid ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                <span className="font-medium">
                  {isAttrAttestationValid && (
                    <p>Attribute attestation is valid</p>
                  )}

                  {<p> {error}</p>}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
