import React, { ReactElement, useEffect, useState } from 'react';
import * as Comlink from 'comlink';
import {
  AttestationObject,
  decode_and_verify,
  Attributes,
  Attribute,
} from 'tlsn-js';
import { CheckCircle, XCircle } from 'lucide-react';

import { CheckCircle2 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './shadcn';

const worker = Comlink.wrap(
  new Worker(new URL('../utils/worker.ts', import.meta.url)),
);

const { init, verify_attestation_signature }: any = worker;

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
  const [decodedAttestation, setDecodedAttestation] =
    useState<AttestationObject | null>(null);
  const [decodedTLSData, setDecodedTLSData] = useState<null | any>(null);
  const [attrAttestations, setAttrAttestations] = useState<null | Attributes>(
    null,
  );

  const verifyAttestation = async () => {
    if (!attestationObject) return setError('Attestation object is invalid');

    try {
      const attestationObject_ = JSON.parse(
        attestationObject,
      ) as AttestationObject;

      setDecodedAttestation(attestationObject_);

      const { isValid, decodedAppData, attributes } = await decode_and_verify(
        attestationObject_,
        verify_attestation_signature,
      );
      if (!isValid) {
        return setError('Signature is invalid');
      }

      setIsAttrAttestationValid(isValid);
      setAttrAttestations(attributes);
      setDecodedTLSData(decodedAppData);
    } catch (e) {
      console.log('ahi', e);
      setIsAttrAttestationValid(false);
      return setError('Attestation is invalid');
    }
  };

  const parseAttestationObject = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    try {
      setAttestationObject(e.target.value);
    } catch (e) {}
  };

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
              className="h-40 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              onChange={parseAttestationObject}
              placeholder={placeholder_object}
            ></textarea>

            <div className="flex justify-center items-center mb-4">
              <button
                onClick={verifyAttestation}
                disabled={!attestationObject}
                className={`px-4 py-2 ${attestationObject ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'} text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 flex items-center`}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Verify
              </button>
            </div>

            {isAttrAttestationValid === false && (
              <div
                className={`mt-4 p-4 rounded-md ${isAttrAttestationValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">
                    {<p> Invalid Attestation {error}</p>}
                  </span>
                </div>
              </div>
            )}

            {isAttrAttestationValid === true && decodedAttestation && (
              <CardAttestation
                notaryUrl={decodedAttestation.meta.notaryUrl}
                domain="api.x.com"
                attributes={attrAttestations}
                decodedTLSData={decodedTLSData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StylizedJSON = ({ data }: { data: any }) => {
  const convertToStylizedYAML = (obj: any, indent = 0): React.ReactNode[] => {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Input must be a valid JSON object');
    }

    const parseData = function (data: any) {
      try {
        const data_ = data.request;
        const lines = data_.split('\n');
        const request = lines.filter((line: string) =>
          line.startsWith('GET'),
        )[0];

        return { request: request, body: data.response_body };
      } catch (e) {
        console.log('error parse attestation', e);
        return data;
      }
    };

    const obj_ = parseData(obj);

    return Object.entries(obj_).map(([key, value], index) => {
      const indentation = '  '.repeat(indent);
      const isArray = Array.isArray(value);
      const isObject = typeof value === 'object' && value !== null && !isArray;

      let content: React.ReactNode;

      if (isObject || isArray) {
        content = (
          <>
            <span className="text-purple-600">{key}:</span> {isArray ? '▼' : ''}
            {convertToStylizedYAML(value, indent + 1)}
          </>
        );
      } else {
        let valueClass = 'text-blue-600';
        if (typeof value === 'string') {
          valueClass = 'text-green-600';
          value = `"${value}"`;
        } else if (typeof value === 'number') {
          valueClass = 'text-orange-600';
        }
        content = (
          <>
            <span className="text-purple-600">{key}:</span>{' '}
            <span className={valueClass}>{value as any}</span>
          </>
        );
      }

      return (
        <div key={index} style={{ marginLeft: `${indent * 20}px` }}>
          {indentation}
          {content}
        </div>
      );
    });
  };

  try {
    const stylizedContent = convertToStylizedYAML(data);
    return (
      <pre className="font-mono text-sm bg-gray-100 p-4 rounded-lg overflow-x-auto">
        {stylizedContent}
      </pre>
    );
  } catch (error) {
    return (
      <div className="text-red-600">Error: {(error as Error).message}</div>
    );
  }
};

const placeholder_object = `
copy the attestation object from the extension
example:
{
  "version": "1.0",
  "meta": {
    "notaryUrl": "https://notary.eternis.ai",
    "websocketProxyUrl": "wss://inn1.eternis.ai:55688"
  },
  "signature": "P256(ecdsa::Signature<NistP256>(D754FEA3193F3115943BA6CD2DBF6FF88A32929D623B9D147514EF8313D9DD9B52EFA52A258C369695D304C1B5FF326895057B7C951A2D8A31B4C492505FB48C))",
  "signedSession": "",
  "applicationData": "4745542068747470733a2f2f73776170692e6465762f6170692f70656f706c652f312f20485454502f312e310d0a686f73743a2073776170692e6465760d0a6163636570742d656e636f64696e673a206964656e746974790d0a7365632d66657463682d6d6f64653a20636f72730d0a6163636570742d6c616e67756167653a20656e2d55532c656e3b713d302e392c66722d46523b713d302e382c66723b713d302e372c656e2d46523b713d302e362c7a682d46523b713d302e352c7a683b713d302e342c61722d46523b713d302e332c61723b713d302e320d0a6163636570743a206170706c69636174696f6e2f6a736f6e2c20746578742f6a6176617363726970742c202a2f2a3b20713d302e30310d0a7365632d63682d75613a2022476f6f676c65204368726f6d65223b763d22313239222c20224e6f743d413f4272616e64223b763d2238222c20224368726f6d69756d223b763d22313239220d0a646e743a20310d0a7365632d66657463682d646573743a20656d7074790d0a726566657265723a2068747470733a2f2f73776170692e6465762f0d0a7365632d63682d75612d706c6174666f726d3a20224c696e7578220d0a636f6f6b69653a2063737266746f6b656e3d414d53436b6749554b696962434c48455357786c3033726e3645615055354b440d0a7365632d63682d75612d6d6f62696c653a203f300d0a7365632d66657463682d736974653a2073616d652d6f726967696e0d0a757365722d6167656e743a204d6f7a696c6c612f352e3020285831313b204c696e7578207838365f363429204170706c655765624b69742f3533372e333620284b48544d4c2c206c696b65204765636b6f29204368726f6d652f3132392e302e302e30205361666172692f3533372e33360d0a636f6e6e656374696f6e3a20636c6f73650d0a782d7265717565737465642d776974683a20584d4c48747470526571756573740d0a0d0a485454502f312e3120323030204f4b0d0a5365727665723a206e67696e782f312e31362e310d0a446174653a204d6f6e2c2033302053657020323032342032303a31323a303620474d540d0a436f6e74656e742d547970653a206170706c69636174696f6e2f6a736f6e0d0a5472616e736665722d456e636f64696e673a206368756e6b65640d0a436f6e6e656374696f6e3a20636c6f73650d0a566172793a204163636570742c20436f6f6b69650d0a582d4672616d652d4f7074696f6e733a2053414d454f524947494e0d0a455461673a20226565333938363130343335633332386634643061346531623064326637626263220d0a416c6c6f773a204745542c20484541442c204f5054494f4e530d0a5374726963742d5472616e73706f72742d53656375726974793a206d61782d6167653d31353736383030300d0a0d0a3238370d0a7b226e616d65223a224c756b6520536b7977616c6b6572222c22686569676874223a22313732222c226d617373223a223737222c22686169725f636f6c6f72223a22626c6f6e64222c22736b696e5f636f6c6f72223a2266616972222c226579655f636f6c6f72223a22626c7565222c2262697274685f79656172223a223139424259222c2267656e646572223a226d616c65222c22686f6d65776f726c64223a2268747470733a2f2f73776170692e6465762f6170692f706c616e6574732f312f222c2266696c6d73223a5b2268747470733a2f2f73776170692e6465762f6170692f66696c6d732f312f222c2268747470733a2f2f73776170692e6465762f6170692f66696c6d732f322f222c2268747470733a2f2f73776170692e6465762f6170692f66696c6d732f332f222c2268747470733a2f2f73776170692e6465762f6170692f66696c6d732f362f225d2c2273706563696573223a5b5d2c2276656869636c6573223a5b2268747470733a2f2f73776170692e6465762f6170692f76656869636c65732f31342f222c2268747470733a2f2f73776170692e6465762f6170692f76656869636c65732f33302f225d2c22737461727368697073223a5b2268747470733a2f2f73776170692e6465762f6170692f7374617273686970732f31322f222c2268747470733a2f2f73776170692e6465762f6170692f7374617273686970732f32322f225d2c2263726561746564223a22323031342d31322d30395431333a35303a35312e3634343030305a222c22656469746564223a22323031342d31322d32305432313a31373a35362e3839313030305a222c2275726c223a2268747470733a2f2f73776170692e6465762f6170692f70656f706c652f312f227d0d0a300d0a0d0a",
  "attestations": ""
}
`;

/*
other example : twitter

{
  "version": "1.0",
  "meta": {
    "notaryUrl": "https://notary.eternis.ai",
    "websocketProxyUrl": "wss://inn1.eternis.ai:55688"
  },
  "signature": "P256(ecdsa::Signature<NistP256>(860CE693C0F9B916840530624F9553508A3FB9A647CFCC7E821EF87A5E8C9BB1DF31457BEA903B7BA5ECAF5BF19655902BD7980B870B03756FABCB48F1E3FDE8))",
  "signedSession": "",
  "applicationData": "statuses>100:P256(ecdsa::Signature<NistP256>(CD0CD9AFF36378D602DA746E9411582D48074ECD04727CBBC5CC0C5A5681C1C2FCF4BA1A35E9E2FCEBAD22C843E95B04C5E595D04259F9ACE1D23FF41C07921E));",
  "attestations": "screen_name=Colosszsinge:P256(ecdsa::Signature<NistP256>(B12101687A474B23E197CBAFEF17600756783BDDB551A72EDFD7C4CBE82135BF118F4562FE187A3E9D51C5F41357BCDA6E53CB16DC77E1AC12464DA56EBB3E66));"
}


*/

function CardAttestation({
  notaryUrl,
  domain,
  attributes,
  decodedTLSData,
}: {
  notaryUrl: string;
  domain: string;
  attributes: Attributes | null;
  decodedTLSData: any;
}) {
  console.log('attributes', attributes);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex justify-center items-center mb-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Attestation for {domain}
          </CardTitle>
          <div className="flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Verified
          </div>
        </CardHeader>
        <CardContent>notary: {notaryUrl}</CardContent>
        <CardContent>
          {showDetails && !attributes && <StylizedJSON data={decodedTLSData} />}

          {attributes && (
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr: Attribute) => (
                <div
                  key={attr.attribute_name}
                  className="inline-flex items-center rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  <span>{attr.attribute_name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {!attributes && (
          <CardFooter className="flex justify-between">
            <button
              className="text-blue-600"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'View data'}
            </button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
