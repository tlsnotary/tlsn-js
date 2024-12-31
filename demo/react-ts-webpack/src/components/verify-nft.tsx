import React, { ReactElement, useEffect, useState } from 'react';
import { Button } from './button';
import { Subtitle } from './subtitle';
import { CodeHashCallout } from './alert';
import { Header } from './header';
import * as Comlink from 'comlink';
import FAQ from './faq';

import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { Github } from 'lucide-react';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const { init, verify_code_attestation }: any = Comlink.wrap(
  new Worker(new URL('../utils/worker.ts', import.meta.url)),
);

const NONCE = '0000000000000000000000000000000000000000';

const EXPECTED_PCR =
  'Y8rvtShn+zXX4Q/t3qn5fYa5WVEijlN/Z+sstfbOLi1Cjpl6PmTfenaaP3ZF8g32';

export function VerifyNFT(): ReactElement {
  const [processingVerification, setProcessingVerification] = useState(false);

  const [resultVerify, setResultVerify] = useState<boolean | null>(null);

  const [codeAttestation, setCodeAttestation] = useState<null | string>(
    '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\n',
  );
  const [error, setError] = useState<null | string>(null);

  const verify_attestation_document = async () => {
    if (!codeAttestation) {
      setError('Please enter a valid code attestation');
      return;
    }
    const codeAttestation_ = codeAttestation.replace(/\\n/g, '').trim();

    //console.log('codeAttestation_', codeAttestation_);
    setProcessingVerification(true);

    try {
      const resultVerify = await verify_code_attestation(
        codeAttestation_,
        NONCE,
        EXPECTED_PCR,
        Math.floor(Date.now() / 1000),
      );
      setResultVerify(resultVerify);
    } catch (e) {
      console.log('error', e);
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
    <main className="px-2 py-12 sm:px-4 text-slate-500">
      <div className="max-w-md mx-auto overflow-hidden md:max-w-2xl">
        <Header />
        <div className="flex flex-col gap-6 p-4 mb-8 overflow-y-auto border sm:p-6 rounded-3xl">
          <section className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-center text-slate-900">
              Verify NFT launch fairness
            </h1>
            <p className="text-lg leading-tight text-center text-balance">
              This verifies that Freysa launched the NFT collection herself from
              an AWS Nitro TEE
            </p>
          </section>
          <CodeHashCallout codeHash={EXPECTED_PCR} />

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

          <section>
            <div className="flex justify-between w-full">
              <Button
                onClick={verify_attestation_document}
                disabled={processingVerification}
                variant="primary"
                // className="flex items-center px-4 py-2 mx-auto text-white bg-blue-700 rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingVerification ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify attestation</>
                )}
              </Button>
              <div className="flex justify-center gap-4 sm:flex-row">
                <Button asChild variant="secondary">
                  <Link
                    to="https://github.com/EternisAI/nitriding-agent-eternis"
                    target="_blank"
                  >
                    <Github className="w-4 h-4" />
                    Codebase
                  </Link>
                </Button>

                <Button asChild variant="secondary">
                  <Link
                    to="https://github.com/EternisAI/nitriding-agent-eternis"
                    target="_blank"
                  >
                    <Github className="w-4 h-4" />
                    Verifier code
                  </Link>
                </Button>
              </div>
            </div>

            {resultVerify !== null && (
              <div
                className={`p-4 mt-6 rounded-xl ${resultVerify ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
              >
                <div className="flex">
                  {!resultVerify ? (
                    <div className="flex flex-col gap-2">
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
                    <ul className="flex flex-col gap-1">
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
        <section>
          <FAQ />
        </section>
      </div>
    </main>
  );
}
