import { Message } from "@/chat-api/store/useMessages";
import Avatar from "../ui/Avatar";
import { Markup } from "../Markup";
import useStore from "@/chat-api/store/useStore";
import { useParams } from "@solidjs/router";
import RouterEndpoints from "@/common/RouterEndpoints";
import { CustomLink } from "../ui/CustomLink";
import { Show, createSignal, onCleanup } from "solid-js";
import Icon from "../ui/icon/Icon";
import Button from "../ui/Button";
import socketClient from "@/chat-api/socketClient";
import { ServerEvents } from "@/chat-api/EventNames";
import { reconcile } from "solid-js/store";
import { formatTimestamp } from "@/common/date";
import { emitScrollToMessage } from "@/common/GlobalEvents";






export function QuoteMessage(props: { message: Message; quote: Partial<Message> }) {
  const [hovered, setHovered] = createSignal(false);
  const params = useParams<{ serverId?: string; channelId?: string }>();
  const { serverMembers, messages } = useStore();
  const serverMember = () => params.serverId ? serverMembers.get(params.serverId, props.quote.createdBy!.id) : undefined;
  socketClient.useSocketOn(ServerEvents.MESSAGE_DELETED, onDelete)
  socketClient.useSocketOn(ServerEvents.MESSAGE_UPDATED, onUpdate)
  
  function onDelete(payload: {channelId: string, messageId: string;}) {
    if (props.quote.id !== payload.messageId) return;
    
    messages.updateLocalMessage({
      quotedMessages: props.message.quotedMessages.filter(m => m.id !== props.quote.id)
    }, props.message.channelId, props.message.id)
  }
  
  function onUpdate(payload: {channelId: string, messageId: string, updated: Message}) {
    if (props.quote.id !== payload.messageId) return;

    const quotedMessages = [...props.message.quotedMessages];
    const index = quotedMessages.findIndex(q => q.id === props.quote.id);
    quotedMessages[index] = {...quotedMessages[index], ...payload.updated} 
    messages.updateLocalMessage({
      quotedMessages,
    }, props.message.channelId, props.message.id)
  }

  const editedAt = () => {
    if (!props.quote.editedAt) return;
    return "Edited at " + formatTimestamp(props.quote.editedAt);
  }

  return (
    <div class="quoteContainer" onmouseenter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div class="headerContainer">
        <CustomLink decoration href={RouterEndpoints.PROFILE(props.quote.createdBy!.id)} style={{ color: serverMember()?.roleColor }}>
          <Avatar animate={hovered()} user={props.quote.createdBy!} size={18} />
        </CustomLink>
        <CustomLink decoration href={RouterEndpoints.PROFILE(props.quote.createdBy!.id)} style={{ "font-size": "16px", color: serverMember()?.roleColor }}>
          {props.quote.createdBy!.username}
        </CustomLink>
        <Show when={props.quote.channelId === params.channelId}>
          <Button class="goToMessageButton" iconName="keyboard_arrow_up" margin={0} padding={4} iconSize={14} onClick={() => emitScrollToMessage({messageId: props.quote.id!})} />
        </Show>
      </div>
      <div>
        <Show when={props.quote.attachments?.length}>
          <Icon style={{"vertical-align": "-0.2em", "margin-right": "4px"}} name="image" color="rgba(255,255,255,0.6)" size={16}/>
        </Show>
        <Markup text={props.quote.content || ""} message={props.quote as Message} isQuote />
        <Show when={props.quote.attachments?.length && !props.quote.content}>
          Image
        </Show>
        <Show when={editedAt()}>
          <Icon class="editIcon" name='edit' size={14} color="rgba(255,255,255,0.4)" title={editedAt()} />
        </Show>
      </div>

    </div>
  )
}


export function QuoteMessageInvalid() {
  return <div class="quoteContainer">Deleted Or Invalid Quote.</div>
}
export function QuoteMessageHidden() {
  return <span class="hiddenQuote">Nested Quote</span>
}