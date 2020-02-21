import * as React from 'react';
import { useCallback, useState } from 'react';

import { useDropzone } from 'react-dropzone';

import { byName, TyrTypeProps, withTypeContext, onTypeChange } from './type';
import { registerComponent } from '../common';
import { decorateField } from '../core';
import { Spin } from 'antd';
import { Tyr } from '../tyreant';

interface S3Value {
  key?: string;
  filename?: string;
  type?: string;
  tmpId?: string;
}

export const TyrS3Base = (props: TyrTypeProps) => {
  const CF_PREFIX = (Tyr.options as any).aws.cloudfrontPrefix;

  const [uploading, setUploading] = useState(false);
  const [counter, setCounter] = useState(0);
  const { document, path } = props;

  const setValue = (value: S3Value) => {
    onTypeChange(props, value, undefined);
    setCounter(counter + 1);
  };

  const onDrop = useCallback(async acceptedFiles => {
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    const url = `/api/${document!.$model.def.name}/${path!.name}/s3${
      document!.$id ? '/' + document!.$id : ''
    }`;

    setUploading(true);
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    const json = await response.json();
    setUploading(false);
    const { msg, tmpId, key } = json;
    if (msg) {
      Tyr.error(msg);
    } else {
      const value: S3Value = {
        key,
        filename: file.name,
        type: file.type
      };
      if (tmpId) value.tmpId = tmpId;
      setValue(value);
      Tyr.success('File uploaded.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false
  });

  return decorateField('s3', props, () => {
    const value = path!.get(document);
    const downloadUrl = value && CF_PREFIX + value.key;

    return (
      <div>
        {value && value.type && value.type.startsWith('image/') && (
          <img className="tyr-s3-image" src={downloadUrl} />
        )}
        {value && value.filename && (
          <div>
            File <b>{value.filename}</b>
            &nbsp;&nbsp;&nbsp;
            <a href={downloadUrl}>download file</a>
            &nbsp;&nbsp;&nbsp;
            <a onClick={() => setValue({})}>remove file</a>
          </div>
        )}
        <Spin spinning={uploading}>
          <div {...getRootProps({ className: 'tyr-dropzone' })}>
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop a file here...</p>
            ) : (
              <p>Drag and drop a file here, or click to select a file</p>
            )}
          </div>
        </Spin>
      </div>
    );
  });
};

export const TyrS3 = withTypeContext('s3', TyrS3Base);

byName.s3 = {
  component: TyrS3Base
};

registerComponent('TyrS3', TyrS3);
