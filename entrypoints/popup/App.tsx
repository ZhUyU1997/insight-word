import { useEffect, useState } from "react";
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
} from "@chakra-ui/react";
import "./App.css";
import { sendMessage } from "../common/messaging";

let DEFAULT_ENABLE = false;
let DEFAULT_PERCENT = 30;

storage
  .getItem<boolean>("local:enable")
  .then((value) => (DEFAULT_ENABLE = value ?? DEFAULT_ENABLE));
storage
  .getItem<number>("local:percent")
  .then((value) => (DEFAULT_PERCENT = value ?? DEFAULT_PERCENT));

function App() {
  const [checked, setChecked] = useState<boolean>(DEFAULT_ENABLE);
  const [ignore, setIgnore] = useState<boolean>(false);
  const [ignoreDisabled, setIgnoreDisable] = useState<boolean>(true);

  const [sliderValue, setSliderValue] = useState(DEFAULT_PERCENT);
  const [hostName, setHostName] = useState("");

  useEffect(() => {
    const get = async () => {
      const value = await storage.getItem<boolean>("local:enable");
      setChecked(value ?? DEFAULT_ENABLE);
      const percent = await storage.getItem<number>("local:percent");
      setSliderValue(percent ?? DEFAULT_PERCENT);

      const tabs = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      const url = tabs[0].url;

      if (url) {
        const hostname = new URL(url).hostname;
        if (hostname) {
          const value = await sendMessage("ignoreListHas", hostname);
          setIgnore(value);
          setIgnoreDisable(false);
          setHostName(hostname);
        }
      }
    };

    get();
  }, []);

  return (
    <FormControl display="flex" alignItems="start" flexDir="column">
      <Box display="flex" alignItems="center" mt="2" mb="2" width="100%">
        <FormLabel mb="0" flexGrow={1}>
          开启单词高亮
        </FormLabel>
        <Switch
          isChecked={checked}
          size="lg"
          onChange={async (e) => {
            setChecked(!checked);
            storage.setItem<boolean>("local:enable", !checked);
          }}
        />
      </Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        mt="2"
        mb="2"
        width="100%"
      >
        <FormLabel mb="0" flexGrow={1}>
          忽略当前网站，刷新生效
        </FormLabel>
        <Switch
          isChecked={ignore}
          isDisabled={ignoreDisabled}
          size="lg"
          onChange={async (e) => {
            const newValue = !ignore;
            setIgnore(newValue);

            if (newValue) {
              sendMessage("ignoreListAdd", hostName);
            } else {
              sendMessage("ignoreListRemove", hostName);
            }
          }}
        />
      </Box>
      <Box
        display="flex"
        alignItems="start"
        mt="2"
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
  );
}

export default App;
