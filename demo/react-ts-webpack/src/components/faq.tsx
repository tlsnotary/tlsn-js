import React from 'react';
import { Link } from 'react-router-dom';

export default function FAQ() {
  return (
    <div className="container flex flex-col mx-auto border rounded-3xl border-slate-200">
      <article className="p-6 prose">
        <h3 className="text-base">What is the code attestation?</h3>
        <p>
          This attestation cryptographically proves that Freysa launched the NFT
          collection from an AWS Nitro Trusted Execution Environment (TEE).
        </p>

        <h3 className="text-base">What is the code hash?</h3>
        <p>
          It is a representation of the environment of the AWS Nitro TEE and the
          code running within it. This code hash is part of the attestation
          signed by AWS
        </p>

        <h3 className="text-base">How to reproduce code hash?</h3>
        <p>The process involves several steps:</p>
        <ol className="list-decimal list-inside">
          <li>
            Clone the{' '}
            <Link
              to="" // TODO: add link
              className="text-blue-500"
            >
              agent codebase
            </Link>
          </li>
          <li>Generate the enclave image using aws nitro cli</li>
          <li>Run the enclave image</li>
          <li>Verify that the PCRs contain the expected code hash</li>
        </ol>

        <h2 className="mb-2 text-2xl font-bold">
          What is the verification process ?
        </h2>
        <div className="">
          {' '}
          This involves several steps including verifying the aws certificate,
          code hash and expiration. Check the{' '}
          <Link
            to="" // TODO: add link
            className="text-blue-500"
          >
            verifier codebase
          </Link>{' '}
          for more details.
        </div>
      </article>
    </div>
  );
}
