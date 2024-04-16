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
} from "@chakra-ui/react";
import "./App.css";
import { GlobalMode, SitMode, sendMessage } from "../common/messaging";

const wordRe = new RegExp("^[a-z][a-z-]*$");

let DEFAULT_GLOBAL_MODE: GlobalMode = "enable";
let DEFAULT_PERCENT = 30;

storage
  .getItem<GlobalMode>("local:mode")
  .then((value) => (DEFAULT_GLOBAL_MODE = value ?? DEFAULT_GLOBAL_MODE));
storage
  .getItem<number>("local:percent")
  .then((value) => (DEFAULT_PERCENT = value ?? DEFAULT_PERCENT));

async function getCurrectActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  return tabs.length >= 1 ? tabs[0] : null;
}

function App() {
  const [globalMode, setGlobalMode] = useState<GlobalMode>(DEFAULT_GLOBAL_MODE);
  const [siteMode, setSiteMode] = useState<SitMode>("follow");

  const [sliderValue, setSliderValue] = useState(DEFAULT_PERCENT);
  const [hostName, setHostName] = useState("");

  useEffect(() => {
    const get = async () => {
      const value = await storage.getItem<GlobalMode>("local:mode");
      setGlobalMode(value ?? DEFAULT_GLOBAL_MODE);
      const percent = await storage.getItem<number>("local:percent");
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

  const inputRef = useRef<ComponentRef<typeof Input>>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, []);
  return (
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
      <Box
        display="flex"
        alignItems="start"
        mt="2"
        mb="2"
        width="100%"
        flexDir="column"
      >
        <Input
          placeholder="输入忽略单词，逗号分隔"
          size="sm"
          ref={inputRef}
          defaultValue={""}
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
              const value = inputRef.current?.value ?? "";
              const words = value
                .split(",，")
                .map((i) => i.trim().toLowerCase())
                .filter((i) => wordRe.test(i));

              const old =
                (await storage.getItem<string[]>("local:ignore-word")) ?? [];

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
                (await storage.getItem<string[]>("local:ignore-word")) ?? [];
              if (inputRef.current) inputRef.current.value = old.join(",");
            }}
          >
            导出忽略单词
          </Button>
        </Box>
      </Box>
    </FormControl>
  );
}

export default App;
