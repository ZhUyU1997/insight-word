import { ComponentRef, useEffect, useRef, useState } from "react";
import {
  Switch,
  FormControl,
  FormLabel,
  border,
  Slider,
  SliderFilledTrack,
  SliderTrack,
  SliderThumb,
  Box,
  SliderMark,
  Select,
  Input,
  Button,
  Divider,
  Textarea,
  TabPanel,
  TabPanels,
  Tabs,
  TabList,
  Tab,
  Badge,
} from "@chakra-ui/react";
import "./App.css";
import { GlobalMode, SitMode, sendMessage } from "../common/messaging";
import * as monaco from "monaco-editor";
import Editor, { loader } from "@monaco-editor/react";
import { safeStorage } from "../common/storage";
import {
  DEFAULT_HIGHLIGHT_STYLE,
  PRESET_HIGHLIGHT_STYLE,
} from "../common/style";

var isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

loader.config({ monaco });

const wordRe = new RegExp("^[a-z][a-z-]*$");

let DEFAULT_GLOBAL_MODE: GlobalMode = "enable";
let DEFAULT_PERCENT = 30;
let CURRENT_HIGHLIGHT_STYLE = DEFAULT_HIGHLIGHT_STYLE;

safeStorage
  .getItem("local:mode")
  .then((value) => (DEFAULT_GLOBAL_MODE = value ?? DEFAULT_GLOBAL_MODE));
safeStorage
  .getItem("local:percent")
  .then((value) => (DEFAULT_PERCENT = value ?? DEFAULT_PERCENT));
safeStorage
  .getItem("local:preference")
  .then(
    (value) =>
      (CURRENT_HIGHLIGHT_STYLE = value?.highlight ?? DEFAULT_HIGHLIGHT_STYLE)
  );

async function getCurrectActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  return tabs.length >= 1 ? tabs[0] : null;
}

async function updateHighlightStyle(css: string) {
  const preference = await safeStorage.getItem("local:preference");

  if (preference) {
    preference.highlight = css;
    safeStorage.setItem("local:preference", preference);
  }
}
function StyleEditorTabPanel() {
  const [content, setContent] = useState("");
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();

  useEffect(() => {
    const get = async () => {
      const preference = await safeStorage.getItem("local:preference");
      if (preference) {
        console.log("editorRef.current", editorRef.current);
        if (editorRef.current)
          editorRef.current?.setValue(preference.highlight);
        else setContent(preference.highlight);
      }
    };
    get();
  }, []);

  return (
    <TabPanel>
      <FormControl display="flex" alignItems="start" flexDir="column">
        <Box
          display="flex"
          alignItems="center"
          // mt="2"
          mb="4"
          width="100%"
          flexDir="row"
          gap={1}
        >
          {PRESET_HIGHLIGHT_STYLE.map((style, index) => {
            return (
              <Badge
                key={index}
                size="sm"
                onClick={() => {
                  editorRef.current?.setValue(style);
                }}
              >
                预设{index + 1}
              </Badge>
            );
          })}

          <Button
            size="sm"
            colorScheme="green"
            alignSelf="end"
            marginLeft="auto"
            onClick={async () => {
              updateHighlightStyle(content);
            }}
          >
            应用
          </Button>
        </Box>
        <Box
          display="flex"
          mb="4"
          width="100%"
          flexDir="row"
          // gap={1}
        >
          <style>{content}</style>
          <div
            className="insight-word-enable"
            dangerouslySetInnerHTML={{
              __html: `<insight-word class="insight-word-highlight">English</insight-word>`,
            }}
            style={{
              height: 50,
              backgroundColor: "black",
              minWidth: "calc(50%)",
              fontSize: 25,
              color: "white",
              lineHeight: "50px",
            }}
          ></div>
          <div
            className="insight-word-enable"
            dangerouslySetInnerHTML={{
              __html: `<insight-word class="insight-word-highlight">English</insight-word>`,
            }}
            style={{
              height: 50,
              backgroundColor: "white",
              minWidth: "50%",
              fontSize: 25,
              color: "black",
              lineHeight: "50px",
            }}
          ></div>
        </Box>
        <Editor
          height="300px"
          width="400px"
          defaultLanguage="css"
          defaultValue={content}
          options={{
            lineNumbers: "off",
            theme: isDarkMode ? "vs-dark" : "vs",
            wordWrap: "on",
            autoDetectHighContrast: true,
            folding: false,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: false,
            },
            contextmenu: false,
            matchBrackets: "never",
            bracketPairColorization: {
              enabled: false,
            },
          }}
          onChange={(value) => {
            setContent(value ?? "");
          }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </FormControl>
    </TabPanel>
  );
}

function App() {
  const [globalMode, setGlobalMode] = useState<GlobalMode>(DEFAULT_GLOBAL_MODE);
  const [siteMode, setSiteMode] = useState<SitMode>("follow");

  const [sliderValue, setSliderValue] = useState(DEFAULT_PERCENT);
  const [hostName, setHostName] = useState("");

  useEffect(() => {
    const get = async () => {
      const value = await safeStorage.getItem("local:mode");
      setGlobalMode(value ?? DEFAULT_GLOBAL_MODE);
      const percent = await safeStorage.getItem("local:percent");
      setSliderValue(percent ?? DEFAULT_PERCENT);

      const tab = await getCurrectActiveTab();

      const url = tab?.url;

      if (url) {
        const hostname = new URL(url).hostname;
        if (hostname) {
          const value = await sendMessage("getSiteMode", hostname);
          setSiteMode(value);
          setHostName(hostname);
        }
      }
    };

    get();
  }, []);

  const textareaRef = useRef<ComponentRef<typeof Textarea>>(null);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.value = "";
  }, []);
  return (
    <Tabs size="md" variant="enclosed">
      <TabList>
        <Tab>基础设置</Tab>
        <Tab>高亮样式</Tab>
        <Tab>单词</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <FormControl display="flex" alignItems="start" flexDir="column">
            <Box display="flex" alignItems="center" mt="2" mb="2" width="100%">
              <FormLabel mb="0" flexGrow={1}>
                全局高亮设置
              </FormLabel>
              <Select
                // placeholder="跟随全局设置"
                value={globalMode}
                size={"sm"}
                width={130}
                onSelect={(e) => {
                  console.log(e.target);
                }}
                onChange={(e) => {
                  const mode = e.target.value as GlobalMode;
                  setGlobalMode(mode);
                  storage.setItem<GlobalMode>("local:mode", mode);
                }}
              >
                <option value="enable">默认开启</option>
                <option value="disable">默认关闭</option>
                <option value="forbidden">禁用所有</option>
              </Select>
            </Box>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb="2"
              width="100%"
            >
              <FormLabel mb="0" flexGrow={1}>
                当前网站设置
              </FormLabel>
              <Select
                // placeholder="跟随全局设置"
                value={siteMode}
                size={"sm"}
                width={130}
                onSelect={(e) => {
                  console.log(e.target);
                }}
                onChange={(e) => {
                  const mode = e.target.value as SitMode;
                  setSiteMode(mode);
                  sendMessage("setSiteMode", { hostName, mode });
                  getCurrectActiveTab().then((tab) => {
                    if (tab) sendMessage("notifySiteModeChanged", mode, tab.id);
                  });
                }}
              >
                <option value="follow">跟随全局</option>
                <option value="include">包含当前</option>
                <option value="exclude">忽略当前</option>
              </Select>
            </Box>
            <Box
              display="flex"
              alignItems="start"
              mb="2"
              width="100%"
              flexDir="column"
            >
              <FormLabel mb="0" width={180} flexGrow={1}>
                过滤高频单词
              </FormLabel>
              <Slider
                mt={4}
                mb={4}
                aria-label="slider-ex-1"
                value={sliderValue}
                onChange={(val) => {
                  setSliderValue(val);
                  storage.setItem<number>("local:percent", val);
                }}
              >
                <SliderMark
                  value={sliderValue}
                  textAlign="center"
                  bg="blue.500"
                  color="white"
                  mt="3"
                  ml="-6"
                  w="12"
                >
                  {sliderValue}%
                </SliderMark>
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>
          </FormControl>
        </TabPanel>
        <StyleEditorTabPanel></StyleEditorTabPanel>
        <TabPanel>
          <FormControl display="flex" alignItems="start" flexDir="column">
            <Box
              display="flex"
              alignItems="start"
              mt="2"
              mb="2"
              width="100%"
              flexDir="column"
            >
              <Textarea
                placeholder="输入忽略单词，逗号分隔"
                size="sm"
                ref={textareaRef}
                defaultValue={""}
                maxHeight={150}
              />
              <Box
                display="flex"
                alignItems="start"
                mt="3"
                mb="2"
                width="100%"
                flexDir="row"
                gap={2}
              >
                <Button
                  size="sm"
                  onClick={async () => {
                    const value = textareaRef.current?.value ?? "";
                    const words = value
                      .split(",，")
                      .map((i) => i.trim().toLowerCase())
                      .filter((i) => wordRe.test(i));

                    const old =
                      (await storage.getItem<string[]>("local:ignore-word")) ??
                      [];

                    await storage.setItem<string[]>(
                      "local:ignore-word",
                      Array.from(new Set([...old, ...words]).keys())
                    );
                  }}
                >
                  导入忽略单词
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const old =
                      (await storage.getItem<string[]>("local:ignore-word")) ??
                      [];
                    if (textareaRef.current)
                      textareaRef.current.value = old.join(",");
                  }}
                >
                  导出忽略单词
                </Button>
              </Box>
            </Box>
          </FormControl>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export default App;
