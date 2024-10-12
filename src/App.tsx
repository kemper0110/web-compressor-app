import './App.css'
import MainModule from '@dardanda/web-compressor'
import wasmUrl from '@dardanda/web-compressor/cmake-build-release/web-compressor.wasm?url'
// import mumu from './mumu.txt?raw'
import {Form, Segmented, Upload, Space, Input, message, UploadFile, Button} from "antd";
import {useState} from "react";
import {InboxOutlined} from '@ant-design/icons';

const {Dragger} = Upload;

const module = await MainModule({
    locateFile(path: string, scriptDirectory: string) {
        console.log('requested to locate', path, scriptDirectory)
        return wasmUrl
    }
})
console.log(module)
console.log(module.toupper('aboba'))


const formItemLayoutWithOutLabel = {
    wrapperCol: {
        xs: {span: 24, offset: 0},
        sm: {span: 20, offset: 4},
    },
};

type Algorithm = 'LZSS' | 'Huffman' | 'HS'
type Operation = 'compress' | 'decompress'

function App() {
    const [algorithm, setAlgorithm] = useState<Algorithm>('HS')
    const [dictSize, setDictSize] = useState<number>(1)
    const [bufferSize, setBufferSize] = useState<number>(8)
    const [result, setResult] = useState<null | string>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [operation, setOperation] = useState<Operation>('compress')
    const [file, setFile] = useState<null | UploadFile>(null)

    const run = async () => {
        if (!file || !file.originFileObj) return
        setLoading(true)
        // wait to update to loading view
        await new Promise(res => setTimeout(res, 100))
        try {
            const content: ArrayBuffer | null = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = event => res((event.target?.result ?? null) as ArrayBuffer | null);
                reader.onerror = rej
                reader.onabort = rej
                reader.readAsArrayBuffer(file.originFileObj!);
            })
            if (!content)
                return

            const result = (() => {
                if (operation === 'decompress') {
                    switch (algorithm) {
                        case "LZSS":
                            return module.LZSSDecompress(content)
                        case "Huffman":
                            return module.HuffmanDecompress(content)
                        case "HS":
                            return module.HSDecompress(content)
                    }
                } else {
                    switch (algorithm) {
                        case "LZSS":
                            return module.LZSSCompress(content, dictSize * 1024, bufferSize * 1024)
                        case "Huffman":
                            return module.HuffmanCompress(content)
                        case "HS":
                            return module.HSCompress(content, dictSize * 1024, bufferSize * 1024)
                    }
                }
            })()

            const blob = new Blob([result], {type: "text/plain"});
            const url = URL.createObjectURL(blob)
            setResult(url)
            message.success(`Результат готов!`);
        } catch (e) {
            message.error(`Ошибка выполнения: ` + e);
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form
            disabled={loading}
            {...formItemLayoutWithOutLabel}
            style={{maxWidth: 600}}
        >
            <Form.Item>
                <Segmented options={[
                    {value: 'HS', label: 'Huffman + LZSS'},
                    {value: 'LZSS', label: "LZSS"},
                    {value: 'Huffman', label: "Huffman"},
                ]}
                           value={algorithm}
                           onChange={v => setAlgorithm(v)}
                />
            </Form.Item>
            {
                algorithm === 'HS' || algorithm === 'LZSS' ? (
                    <>
                        <Form.Item>
                            <Input value={dictSize} onChange={e => setDictSize(Number.parseInt(e.target.value))}
                                   type={'number'}
                                   addonBefore={'Размер словаря'} addonAfter={'КБ'}/>
                        </Form.Item>
                        <Form.Item>
                            <Input value={bufferSize} onChange={e => setBufferSize(Number.parseInt(e.target.value))}
                                   type={'number'}
                                   addonBefore={'Размер буфера'} addonAfter={'КБ'}/>
                        </Form.Item>
                    </>
                ) : null
            }
            <Form.Item>
                <Segmented options={[
                    {value: 'compress', label: 'Сжатие'},
                    {value: 'decompress', label: "Распаковка"},
                ]}
                           value={operation}
                           onChange={v => setOperation(v)}
                />
            </Form.Item>
            <Form.Item>
                <Space>
                    <Dragger multiple={false}
                             fileList={file ? [file] : []}
                             onChange={info => setFile(info.fileList?.[0] ?? null)}
                             beforeUpload={() => false}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined/>
                        </p>
                        <p className="ant-upload-text">Выберите файл или перетащите его в область</p>
                    </Dragger>
                </Space>
            </Form.Item>
            <Form.Item>
                <Button type={'primary'} onClick={run}>
                    Поехали
                </Button>
            </Form.Item>
            <Form.Item>
                {
                    result ? (
                        <a href={result} download={'result'}>
                            Скачать результат
                        </a>
                    ) : null
                }
            </Form.Item>
        </Form>
    )
}

export default App
